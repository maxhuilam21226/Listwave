"use client";

import { useState, useTransition } from "react";
import { deleteProject } from "@/app/actions";
import ConfirmModal from "@/components/ConfirmModal";

/** Small delete affordance for a project card on the dashboard. */
export default function DeleteProjectButton({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const [pending, startTransition] = useTransition();
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label={`Delete ${projectName}`}
        title="Delete project"
        disabled={pending}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowModal(true);
        }}
        className="absolute right-3 top-3 z-10 rounded-md p-1.5 text-faint opacity-0 transition hover:bg-track hover:text-red-600 focus:opacity-100 group-hover:opacity-100 disabled:opacity-50 dark:hover:text-red-400"
      >
        {pending ? (
          <span className="block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M8.75 1a1 1 0 0 0-.96.73L7.4 3H4a1 1 0 0 0 0 2h.06l.73 10.24A2 2 0 0 0 6.78 17h6.44a2 2 0 0 0 1.99-1.76L15.94 5H16a1 1 0 1 0 0-2h-3.4l-.39-1.27A1 1 0 0 0 11.25 1h-2.5ZM9 7a1 1 0 0 0-2 0v6a1 1 0 1 0 2 0V7Zm3 0a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0V7Z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>

      {showModal && (
        <ConfirmModal
          title="Delete project"
          body={`Delete "${projectName}" and all its progress? This can't be undone.`}
          confirmLabel="Delete"
          onConfirm={() => {
            setShowModal(false);
            startTransition(() => deleteProject(projectId));
          }}
          onCancel={() => setShowModal(false)}
        />
      )}
    </>
  );
}
