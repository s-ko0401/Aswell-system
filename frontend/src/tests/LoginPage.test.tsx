import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LoginPage } from "../pages/LoginPage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import api from "@/lib/api";

// APIモック
vi.mock("@/lib/api", async () => {
  const { mockApi } = await import("./mocks");
  return mockApi();
});

// useToastモック
const mockToastFn = vi.fn();
vi.mock("@/hooks/use-toast", async () => {
  return {
    useToast: () => ({
      toast: mockToastFn,
    }),
  };
});

// tokenStorageモック
vi.mock("@/lib/auth", () => ({
  tokenStorage: {
    set: vi.fn(),
  },
}));

// queryClientモック
vi.mock("@/lib/queryClient", () => ({
  queryClient: {
    setQueryData: vi.fn(),
  },
}));

// queryClientの作成
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

// 共通のレンダー関数
const renderLoginPage = () => {
  const queryClient = createTestQueryClient();
  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </QueryClientProvider>,
    ),
    queryClient,
  };
};

describe("LoginPage", () => {
  it("ログインフォームが正しく表示されること", () => {
    renderLoginPage();

    // ログインIDとパスワードの入力欄が表示されているか
    expect(screen.getByLabelText("ログインID")).toBeInTheDocument();
    expect(screen.getByLabelText("パスワード")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "ログイン" }),
    ).toBeInTheDocument();
  });

  // 成功したログインのテスト
  it("ログイン成功時の処理が正しく動作すること", async () => {
    const mockLoginResponse = {
      data: {
        access_token: "test-token",
        user: {
          id: 1,
          username: "Test User",
          email: "test@example.com",
          loginid: "testuser",
          role: 1,
        },
      },
    };

    (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: mockLoginResponse,
    });

    renderLoginPage();

    fireEvent.change(screen.getByLabelText("ログインID"), {
      target: { value: "testuser" },
    });
    fireEvent.change(screen.getByLabelText("パスワード"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/auth/login", {
        loginid: "testuser",
        password: "password123",
      });
    });

    await waitFor(() => {
      expect(mockToastFn).toHaveBeenCalledWith({
        title: "ログインしました",
        description: "ようこそ、Test Userさん",
      });
    });
  });

  // ログイン失敗のテスト
  it("ログイン失敗時の処理が正しく動作すること", async () => {
    (api.post as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Login failed"),
    );

    renderLoginPage();

    fireEvent.change(screen.getByLabelText("ログインID"), {
      target: { value: "wronguser" },
    });
    fireEvent.change(screen.getByLabelText("パスワード"), {
      target: { value: "wrongpass" },
    });
    fireEvent.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => {
      expect(mockToastFn).toHaveBeenCalledWith({
        variant: "destructive",
        title: "ログイン失敗",
        description: "ID またはパスワードが違います",
      });
    });
  });

  // 空入力のテスト
  it("入力が空の場合、バリデーションエラーが表示されること", async () => {
    renderLoginPage();

    fireEvent.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => {
      expect(mockToastFn).toHaveBeenCalledWith({
        variant: "destructive",
        title: "入力エラー",
        description: "ログインIDを入力してください",
      });
      expect(mockToastFn).toHaveBeenCalledWith({
        variant: "destructive",
        title: "入力エラー",
        description: "パスワードを入力してください",
      });
    });
  });

  // パスワードの表示切り替えテスト
  it("パスワードの表示切り替えが機能すること", () => {
    renderLoginPage();

    const passwordInput = screen.getByLabelText("パスワード");

    // 初期状態は type="password"
    expect(passwordInput).toHaveAttribute("type", "password");

    // 表示切り替えボタンをクリック
    const toggleButton = screen.getByRole("button", { name: "Show password" });
    fireEvent.click(toggleButton);

    // type="text" に変わっていることを確認
    expect(passwordInput).toHaveAttribute("type", "text");

    // ボタンのテキストが "Hide password" に変わっていることを確認
    expect(
      screen.getByRole("button", { name: "Hide password" }),
    ).toBeInTheDocument();

    // もう一度クリック
    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));

    // type="password" に戻っていることを確認
    expect(passwordInput).toHaveAttribute("type", "password");
  });
});
