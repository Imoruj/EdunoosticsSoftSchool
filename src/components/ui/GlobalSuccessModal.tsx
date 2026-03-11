"use client";

import { useEffect, useState } from "react";
import SuccessModal from "@/components/ui/SuccessModal";
import { SUCCESS_MESSAGE_EVENT, type SuccessMessageDetail } from "@/lib/successMessage";

const DEFAULT_SUCCESS_DETAIL: Required<SuccessMessageDetail> = {
    title: "Success!",
    message: "Action completed successfully.",
    buttonText: "Got it, thanks!",
};

export default function GlobalSuccessModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [successDetail, setSuccessDetail] = useState<Required<SuccessMessageDetail>>(DEFAULT_SUCCESS_DETAIL);

    useEffect(() => {
        const handleSuccessMessage = (event: Event) => {
            const customEvent = event as CustomEvent<SuccessMessageDetail>;
            if (!customEvent.detail?.message) return;

            setSuccessDetail({
                title: customEvent.detail.title || DEFAULT_SUCCESS_DETAIL.title,
                message: customEvent.detail.message,
                buttonText: customEvent.detail.buttonText || DEFAULT_SUCCESS_DETAIL.buttonText,
            });
            setIsOpen(true);
        };

        window.addEventListener(SUCCESS_MESSAGE_EVENT, handleSuccessMessage as EventListener);
        return () => {
            window.removeEventListener(SUCCESS_MESSAGE_EVENT, handleSuccessMessage as EventListener);
        };
    }, []);

    return (
        <SuccessModal
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            title={successDetail.title}
            message={successDetail.message}
            buttonText={successDetail.buttonText}
        />
    );
}
