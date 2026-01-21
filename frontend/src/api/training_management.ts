import api from "../lib/api";

export type TrainingStatus = "未着手" | "研修中" | "完了";
export type TrainingMoveDirection = "up" | "down";

export type TrainingMinorItem = {
    id: number;
    name: string;
    sort: number;
    status: TrainingStatus;
};

export type TrainingMiddleItem = {
    id: number;
    name: string;
    sort: number;
    minor_items: TrainingMinorItem[];
};

export type TrainingMajorItem = {
    id: number;
    name: string;
    sort: number;
    middle_items: TrainingMiddleItem[];
};

export type Training = {
    id: number;
    name: string;
    training_template_id?: number;
    manager_id: number;
    teacher_id: number;
    trainee_id: number;
    start_date?: string;
    created_by: number;
    created_at: string;
    updated_at: string;
    manager?: { id: number; username: string };
    teacher?: { id: number; username: string };
    trainee?: { id: number; username: string };
    creator?: { id: number; username: string };
    major_items?: TrainingMajorItem[];
};

export type CreateTrainingData = {
    name: string;
    training_template_id?: number;
    manager_id: number;
    teacher_id: number;
    trainee_id: number;
    start_date?: string;
};

export const getTrainings = async (page = 1) => {
    const response = await api.get(`/trainings?page=${page}`);
    return response.data;
};

export const getTraining = async (id: number) => {
    const response = await api.get(`/trainings/${id}`);
    return response.data;
};

export const createTraining = async (data: CreateTrainingData) => {
    const response = await api.post("/trainings", data);
    return response.data;
};

export const updateTraining = async (id: number, data: Partial<CreateTrainingData>) => {
    const response = await api.put(`/trainings/${id}`, data);
    return response.data;
};

export const deleteTraining = async (id: number) => {
    const response = await api.delete(`/trainings/${id}`);
    return response.data;
};

export const updateTrainingItemStatus = async (itemId: number, status: TrainingStatus) => {
    const response = await api.put(`/training-items/${itemId}/status`, { status });
    return response.data;
};

export const createTrainingMajorItem = async (trainingId: number, data: { name: string; after_id?: number }) => {
    const response = await api.post(`/trainings/${trainingId}/major-items`, data);
    return response.data;
};

export const updateTrainingMajorItem = async (id: number, data: { name: string }) => {
    const response = await api.patch(`/training-major-items/${id}`, data);
    return response.data;
};

export const deleteTrainingMajorItem = async (id: number) => {
    const response = await api.delete(`/training-major-items/${id}`);
    return response.data;
};

export const moveTrainingMajorItem = async (id: number, direction: TrainingMoveDirection) => {
    const response = await api.post(`/training-major-items/${id}/move`, { direction });
    return response.data;
};

export const createTrainingMiddleItem = async (majorId: number, data: { name: string; after_id?: number }) => {
    const response = await api.post(`/training-major-items/${majorId}/middle-items`, data);
    return response.data;
};

export const updateTrainingMiddleItem = async (id: number, data: { name: string }) => {
    const response = await api.patch(`/training-middle-items/${id}`, data);
    return response.data;
};

export const deleteTrainingMiddleItem = async (id: number) => {
    const response = await api.delete(`/training-middle-items/${id}`);
    return response.data;
};

export const moveTrainingMiddleItem = async (id: number, direction: TrainingMoveDirection) => {
    const response = await api.post(`/training-middle-items/${id}/move`, { direction });
    return response.data;
};

export const createTrainingMinorItem = async (middleId: number, data: { name: string; after_id?: number }) => {
    const response = await api.post(`/training-middle-items/${middleId}/minor-items`, data);
    return response.data;
};

export const updateTrainingMinorItem = async (id: number, data: { name: string }) => {
    const response = await api.patch(`/training-minor-items/${id}`, data);
    return response.data;
};

export const deleteTrainingMinorItem = async (id: number) => {
    const response = await api.delete(`/training-minor-items/${id}`);
    return response.data;
};

export const moveTrainingMinorItem = async (id: number, direction: TrainingMoveDirection) => {
    const response = await api.post(`/training-minor-items/${id}/move`, { direction });
    return response.data;
};

// Daily Reports
export type TrainingDailyReportEntry = {
    id?: number;
    start_time: string;
    end_time: string;
    work_place: string;
    instructor: string;
    content: string;
    achievement: string;
    sort?: number;
};

export type TrainingDailyReport = {
    id: number;
    training_id: number;
    report_date: string;
    notes?: string;
    created_by?: number;
    created_at: string;
    updated_at: string;
    entries?: TrainingDailyReportEntry[];
};

export type CreateDailyReportData = {
    report_date: string;
    notes?: string;
    entries: Omit<TrainingDailyReportEntry, "id" | "sort">[];
};

export const getDailyReports = async (trainingId: number): Promise<TrainingDailyReport[]> => {
    const response = await api.get(`/trainings/${trainingId}/daily-reports`);
    return response.data;
};

export const getDailyReport = async (id: number): Promise<TrainingDailyReport> => {
    const response = await api.get(`/daily-reports/${id}`);
    return response.data;
};

export const createDailyReport = async (trainingId: number, data: CreateDailyReportData) => {
    const response = await api.post(`/trainings/${trainingId}/daily-reports`, data);
    return response.data;
};

export const updateDailyReport = async (id: number, data: CreateDailyReportData) => {
    const response = await api.put(`/daily-reports/${id}`, data);
    return response.data;
};

export const deleteDailyReport = async (id: number) => {
    const response = await api.delete(`/daily-reports/${id}`);
    return response.data;
};
