"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type AdminPageDeleteButtonProps = {
  pageId: string;
  pageTitle: string;
};

export function AdminPageDeleteButton({
  pageId,
  pageTitle
}: AdminPageDeleteButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    const confirmed = window.confirm(
      `"${pageTitle}" sayfasını kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`
    );

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/pages/${pageId}`, {
          method: "DELETE"
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          const message =
            typeof data?.error?.message === "string"
              ? data.error.message
              : "Sayfa silinirken bir hata oluştu.";
          toast.error(message);
          return;
        }

        toast.success("Sayfa silindi.");
        router.refresh();
      } catch (error) {
        console.error("Sayfa silme isteği başarısız oldu", error);
        toast.error("Sayfa silinirken beklenmedik bir hata oluştu.");
      }
    });
  };

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      onClick={handleDelete}
      disabled={isPending}
    >
      <Trash2 className="mr-2 h-4 w-4" />
      Sil
    </Button>
  );
}
