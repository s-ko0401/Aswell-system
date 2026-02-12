import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { USER_ROLE_OPTIONS } from "@/lib/roles";

type UserFiltersProps = {
  selectedRole: string;
  onRoleChange: (role: string) => void;
  allCount: number;
  getRoleCount: (roleId: number) => number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
};

export function UserFilters({
  selectedRole,
  onRoleChange,
  allCount,
  getRoleCount,
  searchQuery,
  onSearchChange,
}: UserFiltersProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 justify-between w-full">
          <Tabs value={selectedRole} onValueChange={onRoleChange}>
            <TabsList>
              <TabsTrigger value="all">
                全ユーザー
                <Badge variant="secondary" className="ml-2">
                  {allCount}
                </Badge>
              </TabsTrigger>
              {USER_ROLE_OPTIONS.map((option) => (
                <TabsTrigger key={option.value} value={option.value}>
                  {option.label}
                  <Badge variant="secondary" className="ml-2">
                    {getRoleCount(Number(option.value))}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              id="search"
              type="search"
              placeholder="ユーザー名で検索"
              className="w-[250px] pl-9 bg-background"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
