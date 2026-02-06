import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UsersPage } from "@/pages/99_Setting/UsersPage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import api from "@/lib/api";
import { UserRole } from "@/lib/roles";

// APIのモック
vi.mock("@/lib/api", async () => {
  const { mockApi } = await import("./mocks");
  return mockApi();
});

// useAuthのモック
const mockUser = {
  id: 1,
  username: "Admin User",
  role: UserRole.SYSTEM_ADMIN,
};
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    data: mockUser,
  }),
}));

// useToastのモック
const mockToastFn = vi.fn();
vi.mock("@/hooks/use-toast", async () => {
  return {
    useToast: () => ({
      toast: mockToastFn,
    }),
  };
});

// vaulの問題を回避するためにDrawerをモック化
vi.mock("@/components/ui/drawer", async () => {
  const { mockDrawer } = await import("./mocks");
  return mockDrawer();
});

// radix-uiの問題を回避し、シンプルな操作を可能にするためにSelectをモック化
vi.mock("@/components/ui/select", async () => {
  const { mockSelect } = await import("./mocks");
  return mockSelect();
});

// --- ヘルパー ---

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

const renderUsersPage = () => {
  const queryClient = createTestQueryClient();
  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <UsersPage />
        </MemoryRouter>
      </QueryClientProvider>,
    ),
    queryClient,
  };
};

describe("UsersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUsers = [
    {
      id: 1,
      username: "テストユーザー１",
      email: "user1@example.com",
      loginid: "user1",
      staff_number: "001",
      role: 1,
      created_at: "2023-01-01",
      updated_at: "2023-01-01",
    },
    {
      id: 2,
      username: "テストユーザー２",
      email: "user2@example.com",
      loginid: "user2",
      staff_number: "002",
      role: 2,
      created_at: "2023-01-02",
      updated_at: "2023-01-02",
    },
  ];

  const mockMeta = {
    current_page: 1,
    from: 1,
    last_page: 1,
    links: [],
    path: "http://localhost/api/users",
    per_page: 20,
    to: 2,
    total: 2,
    roles: [
      { id: 1, count: 1 },
      { id: 2, count: 1 },
    ],
  };

  it("正しく描画され、ユーザー一覧を取得できる", async () => {
    (api.get as Mock).mockResolvedValue({
      data: { data: mockUsers, meta: mockMeta },
    });

    renderUsersPage();

    expect(screen.getByText("ユーザー")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("テストユーザー１")).toBeInTheDocument();
      expect(screen.getByText("テストユーザー２")).toBeInTheDocument();
    });
  });

  it("検索とフィルタリングが機能する", async () => {
    (api.get as Mock).mockResolvedValue({
      data: { data: [], meta: { ...mockMeta, total: 0 } },
    });

    renderUsersPage();
    const user = userEvent.setup();

    const searchInput =
      screen.getByPlaceholderText("ユーザー名・社員番号で検索");
    await user.type(searchInput, "SearchTerm");

    await waitFor(
      () => {
        expect(api.get).toHaveBeenCalledWith(
          "/users",
          expect.objectContaining({
            params: expect.objectContaining({ search: "SearchTerm" }),
          }),
        );
      },
      { timeout: 2000 },
    );
  });

  it("ロール（権限）によるフィルタリングが機能する", async () => {
    (api.get as Mock).mockResolvedValue({
      data: { data: [], meta: { ...mockMeta, total: 0 } },
    });

    renderUsersPage();
    const user = userEvent.setup();

    // デフォルトは "all"
    expect(
      screen
        .getByRole("tab", { name: /全ユーザー/ })
        .getAttribute("aria-selected"),
    ).toBe("true");

    // システム管理者タブをクリック (value="1")
    const adminTab = screen.getByRole("tab", { name: /システム管理者/ });
    await user.click(adminTab);

    // API呼び出し確認
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        "/users",
        expect.objectContaining({
          params: expect.objectContaining({ role: "1" }),
        }),
      );
    });

    // 一般ユーザータブをクリック (value="2")
    const generalTab = screen.getByRole("tab", { name: /一般ユーザー/ });
    await user.click(generalTab);

    // API呼び出し確認
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        "/users",
        expect.objectContaining({
          params: expect.objectContaining({ role: "2" }),
        }),
      );
    });
  });

  it("ユーザー作成フローが正しく機能する", async () => {
    (api.get as Mock).mockResolvedValue({
      data: { data: mockUsers, meta: mockMeta },
    });
    (api.post as Mock).mockResolvedValue({ data: { message: "Created" } });

    renderUsersPage();
    const user = userEvent.setup();

    await user.click(screen.getByText("新規追加"));

    const drawer = await screen.findByRole("dialog");
    expect(drawer).toBeInTheDocument();

    await user.type(screen.getByLabelText("氏名"), "テストユーザー");
    await user.type(screen.getByLabelText("メール"), "new@example.com");
    await user.type(screen.getByLabelText("ログインID"), "newlogin");
    await user.type(screen.getByLabelText("社員番号"), "999");

    // Password fields
    const passwordInputs = screen.getAllByPlaceholderText("パスワード");
    await user.type(passwordInputs[0], "password123");
    await user.type(passwordInputs[1], "password123");

    // 権限選択 (Mocked Select)
    // 値「2」は UserRole.GENERAL_USER に対応（正しくマッピングされている場合）
    // 必要に応じて src/lib/roles の USER_ROLE_OPTIONS を確認するが、ここでは "2" と想定する
    await user.selectOptions(screen.getByTestId("role-select"), "2");

    // 送信
    const submitBtn = screen.getByRole("button", { name: "追加" });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledTimes(1);
      expect(mockToastFn).toHaveBeenCalledWith(
        expect.objectContaining({ title: "ユーザーを追加しました" }),
      );
    });
  });

  it("メールアドレス、社員番号、またはログインIDが重複している場合、適切なバリデーションエラーが表示される", async () => {
    (api.get as Mock).mockResolvedValue({
      data: { data: mockUsers, meta: mockMeta },
    });

    // バリデーションエラーをモック
    const validationError = {
      response: {
        status: 422,
        data: {
          code: "VALIDATION_ERROR",
          details: {
            email: ["Email already taken"],
            staff_number: ["Staff number already taken"],
            loginid: ["Login ID already taken"],
          },
        },
      },
    };

    (api.post as Mock).mockRejectedValue(validationError);

    renderUsersPage();
    const user = userEvent.setup();

    await user.click(screen.getByText("新規追加"));

    await user.type(screen.getByLabelText("氏名"), "重複テストユーザー");
    await user.type(screen.getByLabelText("メール"), "dup@example.com");
    await user.type(screen.getByLabelText("ログインID"), "duplogin");
    await user.type(screen.getByLabelText("社員番号"), "001");

    const passwordInputs = screen.getAllByPlaceholderText("パスワード");
    await user.type(passwordInputs[0], "password123");
    await user.type(passwordInputs[1], "password123");

    // 権限選択
    await user.selectOptions(screen.getByTestId("role-select"), "2");

    // 送信
    const submitBtn = screen.getByRole("button", { name: "追加" });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledTimes(1);
    });

    // エラーメッセージ確認
    await waitFor(() => {
      expect(screen.getByText("Email already taken")).toBeInTheDocument();
      expect(
        screen.getByText("Staff number already taken"),
      ).toBeInTheDocument();
      expect(screen.getByText("Login ID already taken")).toBeInTheDocument();
    });

    expect(mockToastFn).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: "ユーザーを追加しました" }),
    );
  });

  it("氏名が全角でない場合、バリデーションエラーが表示される", async () => {
    (api.get as Mock).mockResolvedValue({
      data: { data: mockUsers, meta: mockMeta },
    });

    renderUsersPage();
    const user = userEvent.setup();

    await user.click(screen.getByText("新規追加"));

    // 半角文字を入力
    await user.type(screen.getByLabelText("氏名"), "half-width");

    // 送信ボタンをクリック
    const submitBtn = screen.getByRole("button", { name: "追加" });
    await user.click(submitBtn);

    // バリデーションエラーが表示されるのを待つ
    await waitFor(() => {
      expect(
        screen.getByText("ユーザー名は全角で入力してください。"),
      ).toBeInTheDocument();
    });

    // APIが呼ばれていないことを確認
    expect(api.post).not.toHaveBeenCalled();
  });

  it("必須項目が空の場合、バリデーションエラーが表示される", async () => {
    (api.get as Mock).mockResolvedValue({
      data: { data: mockUsers, meta: mockMeta },
    });

    renderUsersPage();
    const user = userEvent.setup();

    await user.click(screen.getByText("新規追加"));

    // 何も入力せずに送信ボタンをクリック
    const submitBtn = screen.getByRole("button", { name: "追加" });
    await user.click(submitBtn);

    // バリデーションエラーが表示されるのを待つ
    await waitFor(() => {
      expect(screen.getByText("ユーザー名は必須です。")).toBeInTheDocument();
      expect(
        screen.getByText("メールアドレスは必須です。"),
      ).toBeInTheDocument();
      expect(screen.getByText("ログインIDは必須です。")).toBeInTheDocument();
      expect(screen.getByText("社員番号は必須です。")).toBeInTheDocument();
      expect(screen.getByText("パスワードは必須です。")).toBeInTheDocument();
      expect(
        screen.getByText("パスワード（確認）は必須です。"),
      ).toBeInTheDocument();
    });

    expect(api.post).not.toHaveBeenCalled();
  });

  it("ユーザー編集フローが正しく機能する", async () => {
    (api.get as Mock).mockResolvedValue({
      data: { data: mockUsers, meta: mockMeta },
    });
    (api.put as Mock).mockResolvedValue({ data: { message: "Updated" } });

    renderUsersPage();
    const user = userEvent.setup();

    // ユーザー一覧が表示されるのを待つ
    await waitFor(() => {
      expect(screen.getByText("テストユーザー１")).toBeInTheDocument();
    });

    // 1行目のメニューボタンをクリック (User One)
    const menuButtons = screen.getAllByRole("button", {
      name: "メニューを開く",
    });
    await user.click(menuButtons[0]);

    // ドロップダウンメニューの「編集」をクリック
    const editOption = screen.getByRole("menuitem", { name: "編集" });
    await user.click(editOption);

    // ドロワーが開くのを待つ & タイトル確認 (編集モードか確認)
    const drawer = await screen.findByRole("dialog");
    expect(drawer).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "ユーザー編集" }),
    ).toBeInTheDocument();

    // フォームがプレ入力されていることを確認
    expect(screen.getByLabelText("氏名")).toHaveValue("テストユーザー１");
    expect(screen.getByLabelText("メール")).toHaveValue("user1@example.com");

    // ユーザー名を変更
    await user.clear(screen.getByLabelText("氏名"));
    await user.type(screen.getByLabelText("氏名"), "テストユーザー更新");

    // 更新ボタンをクリック
    const submitBtn = screen.getByRole("button", { name: "更新" });
    await user.click(submitBtn);

    // API呼び出し確認
    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        "/users/1",
        expect.objectContaining({
          username: "テストユーザー更新",
        }),
      );
      // 新規作成APIは呼ばれていないこと
      expect(api.post).not.toHaveBeenCalled();

      expect(mockToastFn).toHaveBeenCalledWith(
        expect.objectContaining({ title: "ユーザー情報を更新しました" }),
      );
    });
  });

  // 検索結果が空の場合のテスト
  it("検索結果が0件の場合、空の状態のメッセージが表示される", async () => {
    // データが空のレスポンスをモック
    (api.get as Mock).mockResolvedValue({
      data: { data: [], meta: { ...mockMeta, total: 0 } },
    });

    renderUsersPage();
    const user = userEvent.setup();

    // 存在しないユーザーで検索を実行
    // Note: 実際のUIに合わせてプレースホルダーを指定
    const searchInput =
      screen.getByPlaceholderText("ユーザー名・社員番号で検索");
    await user.type(searchInput, "NotExistUser");

    // デバウンスとAPIコールを待機
    await waitFor(
      () => {
        expect(api.get).toHaveBeenCalledWith(
          "/users",
          expect.objectContaining({
            params: expect.objectContaining({ search: "NotExistUser" }),
          }),
        );
      },
      { timeout: 2000 },
    );

    // "ユーザー登録がありません" というメッセージが表示されることを確認
    await waitFor(() => {
      expect(screen.getByText("ユーザー登録がありません")).toBeInTheDocument();
    });
  });

  it("ユーザー削除フローが正しく機能する", async () => {
    (api.get as Mock).mockResolvedValue({
      data: { data: mockUsers, meta: mockMeta },
    });
    (api.delete as Mock).mockResolvedValue({});

    renderUsersPage();
    const user = userEvent.setup();

    // ユーザー一覧が表示されるのを待つ
    await waitFor(() => {
      expect(screen.getByText("テストユーザー１")).toBeInTheDocument();
    });

    // 1行目のメニューボタンをクリック (User One)
    const menuButtons = screen.getAllByRole("button", {
      name: "メニューを開く",
    });
    await user.click(menuButtons[0]);

    // ドロップダウンメニューの「削除」をクリック
    const deleteOption = screen.getByRole("menuitem", { name: "削除" });
    await user.click(deleteOption);

    // 確認ダイアログが表示される
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("本当に削除しますか？")).toBeInTheDocument();

    // 「削除」ボタンをクリック
    const deleteButton = screen.getByRole("button", { name: "削除" });
    await user.click(deleteButton);

    // API呼び出しとトーストの確認
    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith("/users/1");
      expect(mockToastFn).toHaveBeenCalledWith(
        expect.objectContaining({ title: "ユーザーを削除しました" }),
      );
    });
  });
});
