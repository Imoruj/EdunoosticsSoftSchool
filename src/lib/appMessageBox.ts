import type { ReactNode } from "react";

export type AppMessageBoxMode = "alert" | "confirm";
export type AppMessageBoxVariant = "info" | "success" | "warning" | "error";

export interface AppMessageBoxOptions {
    title?: string;
    message: ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant?: AppMessageBoxVariant;
}

export interface AppMessageBoxDetail extends AppMessageBoxOptions {
    id: number;
    mode: AppMessageBoxMode;
    resolve: (confirmed: boolean) => void;
}

export const APP_MESSAGE_BOX_EVENT = "app:message-box";

const dispatchMessageBox = (
    mode: AppMessageBoxMode,
    message: ReactNode,
    options: Omit<AppMessageBoxOptions, "message"> = {}
) => {
    if (typeof window === "undefined") {
        return Promise.resolve(mode === "confirm" ? false : true);
    }

    return new Promise<boolean>((resolve) => {
        window.dispatchEvent(
            new CustomEvent<AppMessageBoxDetail>(APP_MESSAGE_BOX_EVENT, {
                detail: {
                    id: Date.now() + Math.random(),
                    mode,
                    message,
                    title: options.title,
                    confirmText: options.confirmText,
                    cancelText: options.cancelText,
                    variant: options.variant,
                    resolve,
                },
            })
        );
    });
};

export const showAppAlert = (
    message: ReactNode,
    options: Omit<AppMessageBoxOptions, "message"> = {}
) => dispatchMessageBox("alert", message, options).then(() => undefined);

export const showAppConfirm = (
    message: ReactNode,
    options: Omit<AppMessageBoxOptions, "message"> = {}
) => dispatchMessageBox("confirm", message, options);
