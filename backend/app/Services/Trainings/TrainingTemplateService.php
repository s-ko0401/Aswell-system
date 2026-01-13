<?php

namespace App\Services\Trainings;

use App\Http\Requests\StoreTrainingTemplateRequest;
use App\Http\Requests\UpdateTrainingTemplateRequest;
use App\Models\TrainingTemplate;
use App\Models\TrainingTemplateMajorItem;
use App\Models\TrainingTemplateMiddleItem;
use App\Models\TrainingTemplateMinorItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TrainingTemplateService
{
    public function index(): JsonResponse
    {
        $templates = TrainingTemplate::with(['creator', 'majorItems.middleItems.minorItems'])
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return response()->json($templates);
    }

    public function store(StoreTrainingTemplateRequest $request): JsonResponse
    {
        try {
            DB::beginTransaction();

            $template = TrainingTemplate::create([
                'name' => $request->name,
                'created_by' => $request->user()->id,
            ]);

            if ($request->has('major_items')) {
                foreach ($request->major_items as $majorData) {
                    $majorItem = $template->majorItems()->create([
                        'name' => $majorData['name'],
                        'sort' => $majorData['sort'],
                    ]);

                    if (isset($majorData['middle_items'])) {
                        foreach ($majorData['middle_items'] as $middleData) {
                            $middleItem = $majorItem->middleItems()->create([
                                'name' => $middleData['name'],
                                'sort' => $middleData['sort'],
                            ]);

                            if (isset($middleData['minor_items'])) {
                                foreach ($middleData['minor_items'] as $minorData) {
                                    $middleItem->minorItems()->create([
                                        'name' => $minorData['name'],
                                        'sort' => $minorData['sort'],
                                    ]);
                                }
                            }
                        }
                    }
                }
            }

            DB::commit();

            return response()->json($template->load('majorItems.middleItems.minorItems'), 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to create training template: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to create training template'], 500);
        }
    }

    public function show(string $id): JsonResponse
    {
        $template = TrainingTemplate::with('majorItems.middleItems.minorItems')->findOrFail($id);
        return response()->json($template);
    }

    public function update(UpdateTrainingTemplateRequest $request, string $id): JsonResponse
    {
        try {
            DB::beginTransaction();

            $template = TrainingTemplate::findOrFail($id);
            $template->update(['name' => $request->name]);

            $this->syncMajorItems($template, $request->major_items ?? []);

            DB::commit();

            return response()->json($template->load('majorItems.middleItems.minorItems'));
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to update training template: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to update training template'], 500);
        }
    }

    public function destroy(string $id): JsonResponse
    {
        $template = TrainingTemplate::findOrFail($id);
        $template->delete();

        return response()->json(['message' => 'Template deleted successfully']);
    }

    private function syncMajorItems(TrainingTemplate $template, array $itemsData): void
    {
        $existingIds = $template->majorItems()->pluck('id')->toArray();
        $inputIds = array_filter(array_column($itemsData, 'id'));

        $toDelete = array_diff($existingIds, $inputIds);
        TrainingTemplateMajorItem::destroy($toDelete);

        foreach ($itemsData as $data) {
            if (isset($data['id']) && in_array($data['id'], $existingIds)) {
                $item = TrainingTemplateMajorItem::find($data['id']);
                $item->update([
                    'name' => $data['name'],
                    'sort' => $data['sort'],
                ]);
            } else {
                $item = $template->majorItems()->create([
                    'name' => $data['name'],
                    'sort' => $data['sort'],
                ]);
            }

            $this->syncMiddleItems($item, $data['middle_items'] ?? []);
        }
    }

    private function syncMiddleItems(TrainingTemplateMajorItem $majorItem, array $itemsData): void
    {
        $existingIds = $majorItem->middleItems()->pluck('id')->toArray();
        $inputIds = array_filter(array_column($itemsData, 'id'));

        $toDelete = array_diff($existingIds, $inputIds);
        TrainingTemplateMiddleItem::destroy($toDelete);

        foreach ($itemsData as $data) {
            if (isset($data['id']) && in_array($data['id'], $existingIds)) {
                $item = TrainingTemplateMiddleItem::find($data['id']);
                $item->update([
                    'name' => $data['name'],
                    'sort' => $data['sort'],
                ]);
            } else {
                $item = $majorItem->middleItems()->create([
                    'name' => $data['name'],
                    'sort' => $data['sort'],
                ]);
            }

            $this->syncMinorItems($item, $data['minor_items'] ?? []);
        }
    }

    private function syncMinorItems(TrainingTemplateMiddleItem $middleItem, array $itemsData): void
    {
        $existingIds = $middleItem->minorItems()->pluck('id')->toArray();
        $inputIds = array_filter(array_column($itemsData, 'id'));

        $toDelete = array_diff($existingIds, $inputIds);
        TrainingTemplateMinorItem::destroy($toDelete);

        foreach ($itemsData as $data) {
            if (isset($data['id']) && in_array($data['id'], $existingIds)) {
                $item = TrainingTemplateMinorItem::find($data['id']);
                $item->update([
                    'name' => $data['name'],
                    'sort' => $data['sort'],
                ]);
            } else {
                $middleItem->minorItems()->create([
                    'name' => $data['name'],
                    'sort' => $data['sort'],
                ]);
            }
        }
    }
}
