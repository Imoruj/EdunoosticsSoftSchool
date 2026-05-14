import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

export const studentKeys = {
    all: ["students"] as const,
    lists: () => [...studentKeys.all, "list"] as const,
    list: (params: string) => [...studentKeys.lists(), { params }] as const,
    details: () => [...studentKeys.all, "detail"] as const,
    detail: (id: string) => [...studentKeys.details(), id] as const,
    changeRequests: () => [...studentKeys.all, "changeRequests"] as const,
};

export function useStudentsList(params: string, enabled: boolean = true) {
    return useQuery({
        queryKey: studentKeys.list(params),
        queryFn: () => apiClient(`/api/students?${params}`),
        enabled,
    });
}

export function useStudentChangeRequests(isAdmin: boolean) {
    return useQuery({
        queryKey: studentKeys.changeRequests(),
        queryFn: () => apiClient("/api/students/change-requests?status=PENDING&limit=20"),
        enabled: isAdmin,
    });
}

export function useDeleteStudent() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => apiClient(`/api/students?id=${id}`, { method: "DELETE" }),
        onSuccess: (data, variables, context) => {
            queryClient.invalidateQueries({ queryKey: studentKeys.lists() });
            queryClient.invalidateQueries({ queryKey: studentKeys.changeRequests() });
        },
    });
}
