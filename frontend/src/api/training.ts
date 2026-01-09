import api from "../lib/api";

export type TrainingTemplateMinorItem = {
    id?: number;
    name: string;
    sort: number;
};

export type TrainingTemplateMiddleItem = {
    id?: number;
    name: string;
    sort: number;
    minor_items?: TrainingTemplateMinorItem[];
};

export type TrainingTemplateMajorItem = {
    id?: number;
    name: string;
    sort: number;
    middle_items?: TrainingTemplateMiddleItem[];
};

export type TrainingTemplate = {
    id: number;
    name: string;
    created_by: number;
    created_at: string;
    updated_at: string;
    major_items?: TrainingTemplateMajorItem[];
    creator?: {
        id: number;
        username: string;
        email: string;
    };
};

export type TrainingTemplateFormData = {
    name: string;
    major_items?: TrainingTemplateMajorItem[];
};

export const getTrainingTemplates = async (page = 1) => {
    const response = await api.get(`/training-templates?page=${page}`);
    return response.data;
};

export const getTrainingTemplate = async (id: number) => {
    const response = await api.get(`/training-templates/${id}`);
    return response.data;
};

export const createTrainingTemplate = async (data: TrainingTemplateFormData) => {
    const response = await api.post("/training-templates", data);
    return response.data;
};

export const updateTrainingTemplate = async (id: number, data: TrainingTemplateFormData) => {
    const response = await api.put(`/training-templates/${id}`, data);
    return response.data;
};

export const deleteTrainingTemplate = async (id: number) => {
    const response = await api.delete(`/training-templates/${id}`);
    return response.data;
};
