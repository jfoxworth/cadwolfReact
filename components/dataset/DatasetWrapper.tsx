import DatasetView from "./DatasetView";
import DatasetEdit from "./DatasetEdit";
import type { DatasetPageData } from "@/types/dataset";

interface DatasetWrapperProps {
  data: DatasetPageData;
  canEdit: boolean;
}

export default function DatasetWrapper({ data, canEdit }: DatasetWrapperProps) {
  const { dataset } = data;

  return (
    <div className="flex-1 px-8 py-10 max-w-5xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{dataset.name}</h1>
        {dataset.description && (
          <p className="mt-1 text-gray-500">{dataset.description}</p>
        )}
      </div>

      {canEdit ? (
        <DatasetEdit dataset={dataset} />
      ) : (
        <DatasetView dataset={dataset} />
      )}
    </div>
  );
}
