<?php

namespace App\Services\Trainings;

use App\Models\Training;
use App\Models\TrainingMajorItem;
use App\Models\TrainingMiddleItem;
use App\Models\TrainingMinorItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TrainingItemService
{
    public function storeMajor(Request $request, int $trainingId): JsonResponse
    {
        $training = Training::findOrFail($trainingId);
        $this->authorizeTraining($training, $request->user()->id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'after_id' => 'nullable|integer',
        ]);

        return DB::transaction(function () use ($trainingId, $validated) {
            $newSort = $this->nextSortForMajor($trainingId, $validated['after_id'] ?? null);

            $major = TrainingMajorItem::create([
                'training_id' => $trainingId,
                'name' => $validated['name'],
                'sort' => $newSort,
            ]);

            return response()->json($major, 201);
        });
    }

    public function updateMajor(Request $request, int $id): JsonResponse
    {
        $major = TrainingMajorItem::with('training')->findOrFail($id);
        $this->authorizeTraining($major->training, $request->user()->id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $major->update(['name' => $validated['name']]);

        return response()->json($major);
    }

    public function destroyMajor(Request $request, int $id): JsonResponse
    {
        $major = TrainingMajorItem::findOrFail($id);
        $training = Training::findOrFail($major->training_id);
        $this->authorizeTraining($training, $request->user()->id);

        $sort = $major->sort;
        $trainingId = $major->training_id;
        $major->delete();

        TrainingMajorItem::where('training_id', $trainingId)
            ->where('sort', '>', $sort)
            ->decrement('sort');

        return response()->json(['message' => 'Deleted']);
    }

    public function moveMajor(Request $request, int $id): JsonResponse
    {
        $major = TrainingMajorItem::findOrFail($id);
        $training = Training::findOrFail($major->training_id);
        $this->authorizeTraining($training, $request->user()->id);

        $validated = $request->validate([
            'direction' => 'required|in:up,down',
        ]);

        $target = $validated['direction'] === 'up'
            ? TrainingMajorItem::where('training_id', $major->training_id)
                ->where('sort', '<', $major->sort)
                ->orderByDesc('sort')
                ->first()
            : TrainingMajorItem::where('training_id', $major->training_id)
                ->where('sort', '>', $major->sort)
                ->orderBy('sort')
                ->first();

        if (!$target) {
            return response()->json($major);
        }

        DB::transaction(function () use ($major, $target) {
            $originalSort = $major->sort;
            $major->sort = $target->sort;
            $target->sort = $originalSort;
            $major->save();
            $target->save();
        });

        return response()->json($major->refresh());
    }

    public function storeMiddle(Request $request, int $majorId): JsonResponse
    {
        $major = TrainingMajorItem::findOrFail($majorId);
        $training = Training::findOrFail($major->training_id);
        $this->authorizeTraining($training, $request->user()->id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'after_id' => 'nullable|integer',
        ]);

        return DB::transaction(function () use ($majorId, $validated) {
            $newSort = $this->nextSortForMiddle($majorId, $validated['after_id'] ?? null);

            $middle = TrainingMiddleItem::create([
                'training_major_item_id' => $majorId,
                'name' => $validated['name'],
                'sort' => $newSort,
            ]);

            return response()->json($middle, 201);
        });
    }

    public function updateMiddle(Request $request, int $id): JsonResponse
    {
        $middle = TrainingMiddleItem::findOrFail($id);
        $major = TrainingMajorItem::findOrFail($middle->training_major_item_id);
        $training = Training::findOrFail($major->training_id);
        $this->authorizeTraining($training, $request->user()->id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $middle->update(['name' => $validated['name']]);

        return response()->json($middle);
    }

    public function destroyMiddle(Request $request, int $id): JsonResponse
    {
        $middle = TrainingMiddleItem::findOrFail($id);
        $major = TrainingMajorItem::findOrFail($middle->training_major_item_id);
        $training = Training::findOrFail($major->training_id);
        $this->authorizeTraining($training, $request->user()->id);

        $sort = $middle->sort;
        $majorId = $middle->training_major_item_id;
        $middle->delete();

        TrainingMiddleItem::where('training_major_item_id', $majorId)
            ->where('sort', '>', $sort)
            ->decrement('sort');

        return response()->json(['message' => 'Deleted']);
    }

    public function moveMiddle(Request $request, int $id): JsonResponse
    {
        $middle = TrainingMiddleItem::findOrFail($id);
        $major = TrainingMajorItem::findOrFail($middle->training_major_item_id);
        $training = Training::findOrFail($major->training_id);
        $this->authorizeTraining($training, $request->user()->id);

        $validated = $request->validate([
            'direction' => 'required|in:up,down',
        ]);

        $target = $validated['direction'] === 'up'
            ? TrainingMiddleItem::where('training_major_item_id', $middle->training_major_item_id)
                ->where('sort', '<', $middle->sort)
                ->orderByDesc('sort')
                ->first()
            : TrainingMiddleItem::where('training_major_item_id', $middle->training_major_item_id)
                ->where('sort', '>', $middle->sort)
                ->orderBy('sort')
                ->first();

        if (!$target) {
            return response()->json($middle);
        }

        DB::transaction(function () use ($middle, $target) {
            $originalSort = $middle->sort;
            $middle->sort = $target->sort;
            $target->sort = $originalSort;
            $middle->save();
            $target->save();
        });

        return response()->json($middle->refresh());
    }

    public function storeMinor(Request $request, int $middleId): JsonResponse
    {
        $middle = TrainingMiddleItem::findOrFail($middleId);
        $major = TrainingMajorItem::findOrFail($middle->training_major_item_id);
        $training = Training::findOrFail($major->training_id);
        $this->authorizeTraining($training, $request->user()->id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'after_id' => 'nullable|integer',
        ]);

        return DB::transaction(function () use ($middleId, $validated) {
            $newSort = $this->nextSortForMinor($middleId, $validated['after_id'] ?? null);

            $minor = TrainingMinorItem::create([
                'training_middle_item_id' => $middleId,
                'name' => $validated['name'],
                'sort' => $newSort,
                'status' => '未着手',
            ]);

            return response()->json($minor, 201);
        });
    }

    public function updateMinor(Request $request, int $id): JsonResponse
    {
        $minor = TrainingMinorItem::findOrFail($id);
        $middle = TrainingMiddleItem::findOrFail($minor->training_middle_item_id);
        $major = TrainingMajorItem::findOrFail($middle->training_major_item_id);
        $training = Training::findOrFail($major->training_id);
        $this->authorizeTraining($training, $request->user()->id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $minor->update(['name' => $validated['name']]);

        return response()->json($minor);
    }

    public function destroyMinor(Request $request, int $id): JsonResponse
    {
        $minor = TrainingMinorItem::findOrFail($id);
        $middle = TrainingMiddleItem::findOrFail($minor->training_middle_item_id);
        $major = TrainingMajorItem::findOrFail($middle->training_major_item_id);
        $training = Training::findOrFail($major->training_id);
        $this->authorizeTraining($training, $request->user()->id);

        $sort = $minor->sort;
        $middleId = $minor->training_middle_item_id;
        $minor->delete();

        TrainingMinorItem::where('training_middle_item_id', $middleId)
            ->where('sort', '>', $sort)
            ->decrement('sort');

        return response()->json(['message' => 'Deleted']);
    }

    public function moveMinor(Request $request, int $id): JsonResponse
    {
        $minor = TrainingMinorItem::findOrFail($id);
        $middle = TrainingMiddleItem::findOrFail($minor->training_middle_item_id);
        $major = TrainingMajorItem::findOrFail($middle->training_major_item_id);
        $training = Training::findOrFail($major->training_id);
        $this->authorizeTraining($training, $request->user()->id);

        $validated = $request->validate([
            'direction' => 'required|in:up,down',
        ]);

        $target = $validated['direction'] === 'up'
            ? TrainingMinorItem::where('training_middle_item_id', $minor->training_middle_item_id)
                ->where('sort', '<', $minor->sort)
                ->orderByDesc('sort')
                ->first()
            : TrainingMinorItem::where('training_middle_item_id', $minor->training_middle_item_id)
                ->where('sort', '>', $minor->sort)
                ->orderBy('sort')
                ->first();

        if (!$target) {
            return response()->json($minor);
        }

        DB::transaction(function () use ($minor, $target) {
            $originalSort = $minor->sort;
            $minor->sort = $target->sort;
            $target->sort = $originalSort;
            $minor->save();
            $target->save();
        });

        return response()->json($minor->refresh());
    }

    private function authorizeTraining(Training $training, int $userId): void
    {
        if ($training->manager_id !== $userId && $training->teacher_id !== $userId) {
            abort(403, 'Forbidden');
        }
    }

    private function nextSortForMajor(int $trainingId, ?int $afterId): int
    {
        if ($afterId) {
            $after = TrainingMajorItem::where('training_id', $trainingId)->findOrFail($afterId);
            $newSort = $after->sort + 1;
            TrainingMajorItem::where('training_id', $trainingId)
                ->where('sort', '>=', $newSort)
                ->increment('sort');
            return $newSort;
        }

        return (int) TrainingMajorItem::where('training_id', $trainingId)->max('sort') + 1;
    }

    private function nextSortForMiddle(int $majorId, ?int $afterId): int
    {
        if ($afterId) {
            $after = TrainingMiddleItem::where('training_major_item_id', $majorId)->findOrFail($afterId);
            $newSort = $after->sort + 1;
            TrainingMiddleItem::where('training_major_item_id', $majorId)
                ->where('sort', '>=', $newSort)
                ->increment('sort');
            return $newSort;
        }

        return (int) TrainingMiddleItem::where('training_major_item_id', $majorId)->max('sort') + 1;
    }

    private function nextSortForMinor(int $middleId, ?int $afterId): int
    {
        if ($afterId) {
            $after = TrainingMinorItem::where('training_middle_item_id', $middleId)->findOrFail($afterId);
            $newSort = $after->sort + 1;
            TrainingMinorItem::where('training_middle_item_id', $middleId)
                ->where('sort', '>=', $newSort)
                ->increment('sort');
            return $newSort;
        }

        return (int) TrainingMinorItem::where('training_middle_item_id', $middleId)->max('sort') + 1;
    }
}
