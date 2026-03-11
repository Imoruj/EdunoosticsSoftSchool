export interface SuccessMessageDetail {
    title?: string;
    message: string;
    buttonText?: string;
}

export const SUCCESS_MESSAGE_EVENT = "app:success-message";

export const showSuccessMessage = (
    message: string,
    options: Omit<SuccessMessageDetail, "message"> = {}
) => {
    if (typeof window === "undefined") return;

    window.dispatchEvent(
        new CustomEvent<SuccessMessageDetail>(SUCCESS_MESSAGE_EVENT, {
            detail: {
                ...options,
                message,
            },
        })
    );
};
