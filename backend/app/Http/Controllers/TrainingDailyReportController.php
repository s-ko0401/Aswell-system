<?php

namespace App\Http\Controllers;

use App\Models\Training;
use App\Models\TrainingDailyReport;
use App\Models\TrainingDailyReportEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TrainingDailyReportController extends Controller
{
    public function index(string $trainingId): JsonResponse
    {
        $reports = TrainingDailyReport::where('training_id', $trainingId)
            ->orderBy('report_date', 'desc')
            ->get();

        return response()->json($reports);
    }

    public function show(string $id): JsonResponse
    {
        $report = TrainingDailyReport::with('entries')->findOrFail($id);
        return response()->json($report);
    }

    public function store(Request $request, string $trainingId): JsonResponse
    {
        $request->validate([
            'report_date' => 'required|date',
            'notes' => 'nullable|string',
            'entries' => 'required|array|min:1',
            'entries.*.start_time' => 'required',
            'entries.*.end_time' => 'required',
            'entries.*.work_place' => 'required|string',
            'entries.*.instructor' => 'required|string',
            'entries.*.content' => 'required|string',
            'entries.*.achievement' => 'required|string',
        ]);

        try {
            return DB::transaction(function () use ($request, $trainingId) {
                $report = TrainingDailyReport::create([
                    'training_id' => $trainingId,
                    'report_date' => $request->report_date,
                    'notes' => $request->notes,
                    'created_by' => $request->user()->id,
                ]);

                foreach ($request->entries as $index => $entryData) {
                    $report->entries()->create(array_merge($entryData, ['sort' => $index]));
                }

                return response()->json($report->load('entries'), 201);
            });
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to create report: ' . $e->getMessage()], 500);
        }
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $report = TrainingDailyReport::findOrFail($id);

        $request->validate([
            'report_date' => 'date',
            'notes' => 'nullable|string',
            'entries' => 'array|min:1',
            'entries.*.start_time' => 'required',
            'entries.*.end_time' => 'required',
            'entries.*.work_place' => 'required|string',
            'entries.*.instructor' => 'required|string',
            'entries.*.content' => 'required|string',
            'entries.*.achievement' => 'required|string',
        ]);

        try {
            return DB::transaction(function () use ($request, $report) {
                $report->update($request->only(['report_date', 'notes']));

                if ($request->has('entries')) {
                    $report->entries()->delete();
                    foreach ($request->entries as $index => $entryData) {
                        $report->entries()->create(array_merge($entryData, ['sort' => $index]));
                    }
                }

                return response()->json($report->load('entries'));
            });
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to update report: ' . $e->getMessage()], 500);
        }
    }

    public function destroy(string $id): JsonResponse
    {
        $report = TrainingDailyReport::findOrFail($id);
        $report->delete();

        return response()->json(['message' => 'Report deleted successfully']);
    }
}
