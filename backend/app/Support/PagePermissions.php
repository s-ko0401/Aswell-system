<?php

namespace App\Support;

use App\Models\User;

class PagePermissions
{
    /**
     * @return array<int, string>
     */
    public static function all(): array
    {
        return config('page_permissions.pages', []);
    }

    /**
     * @return array<int, string>
     */
    public static function defaults(): array
    {
        return config('page_permissions.defaults', []);
    }

    /**
     * @return array<int, string>
     */
    public static function resolve(User $user): array
    {
        if ((int) $user->role === 1) {
            return self::all();
        }

        $permissions = $user->page_permissions;
        if (is_array($permissions) && !empty($permissions)) {
            return array_values(array_intersect($permissions, self::all()));
        }

        return self::defaults();
    }

    public static function canAccess(User $user, string $page): bool
    {
        return in_array($page, self::resolve($user), true);
    }
}
