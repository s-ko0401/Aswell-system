<?php

namespace App\Http\Controllers;

use App\Models\Training;
use App\Models\TrainingTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TrainingController extends Controller
{
    public function index(): JsonResponse
    {
        $trainings = Training::with([
            'manager',
            'teacher',
            'trainee',
            'creator',
            'majorItems.middleItems.minorItems'
        ])
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return response()->json($trainings);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'training_template_id' => 'nullable|integer',
            'manager_id' => 'required|exists:users,id',
            'teacher_id' => 'required|exists:users,id',
            'trainee_id' => 'required|exists:users,id',
            'start_date' => 'nullable|date',
        ]);

        try {
            return DB::transaction(function () use ($request) {
                // 1. Create Training
                $training = Training::create([
                    'name' => $request->name,
                    'training_template_id' => $request->training_template_id,
                    'manager_id' => $request->manager_id,
                    'teacher_id' => $request->teacher_id,
                    'trainee_id' => $request->trainee_id,
                    'start_date' => $request->start_date,
                    'created_by' => $request->user()->id,
                ]);

                // 2. Copy Template Structure if template_id is provided
                if ($request->training_template_id) {
                    $template = TrainingTemplate::with('majorItems.middleItems.minorItems')
                        ->find($request->training_template_id);

                    if ($template) {
                        foreach ($template->majorItems as $tMajor) {
                            $major = $training->majorItems()->create([
                                'name' => $tMajor->name,
                                'sort' => $tMajor->sort,
                            ]);

                            foreach ($tMajor->middleItems as $tMiddle) {
                                $middle = $major->middleItems()->create([
                                    'name' => $tMiddle->name,
                                    'sort' => $tMiddle->sort,
                                ]);

                                foreach ($tMiddle->minorItems as $tMinor) {
                                    $middle->minorItems()->create([
                                        'name' => $tMinor->name,
                                        'sort' => $tMinor->sort,
                                        'status' => '未着手',
                                    ]);
                                }
                            }
                        }
                    }
                }

                return response()->json($training->load('majorItems.middleItems.minorItems'), 201);
            });
        } catch (\Exception $e) {
            Log::error('Failed to create training: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to create training'], 500);
        }
    }

    public function show(string $id): JsonResponse
    {
        $training = Training::with([
            'manager',
            'teacher',
            'trainee',
            'creator',
            'majorItems.middleItems.minorItems'
        ])->findOrFail($id);

        return response()->json($training);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $training = Training::findOrFail($id);

        $request->validate([
            'name' => 'string|max:255',
            'manager_id' => 'exists:users,id',
            'teacher_id' => 'exists:users,id',
            'trainee_id' => 'exists:users,id',
            'start_date' => 'nullable|date',
        ]);

        $training->update($request->all());

        return response()->json($training);
    }

    public function destroy(string $id): JsonResponse
    {
        $training = Training::findOrFail($id);
        $training->delete();

        return response()->json(['message' => 'Training deleted successfully']);
    }

    /**
     * Update status of a minor item
     */
    public function updateItemStatus(Request $request, $itemId): JsonResponse
    {
        $request->validate([
            'status' => 'required|in:未着手,研修中,完了',
        ]);

        $item = \App\Models\TrainingMinorItem::findOrFail($itemId);
        $item->update(['status' => $request->status]);

        return response()->json($item);
    }
}
