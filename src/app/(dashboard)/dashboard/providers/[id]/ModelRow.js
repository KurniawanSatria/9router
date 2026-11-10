import PropTypes from "prop-types";
import { CapacityBadges } from "@/shared/components";
import ModelIcon from "@/shared/components/ModelIcon";
import Icon from "@/shared/components/Icon";

export default function ModelRow({ model, fullModel, alias, copied, onCopy, testStatus, isCustom, isFree, onDeleteAlias, onTest, isTesting, onDisable, caps, thinkingSuffix }) {
  const displayModel = thinkingSuffix ? `${fullModel}(${thinkingSuffix})` : fullModel;
  const borderColor = testStatus === "ok"
    ? "border-success-500/40"
    : testStatus === "error"
    ? "border-error-500/40"
    : "border-card-border";

  return (
    <div className={`group w-full sm:w-auto min-w-0 max-w-full rounded-lg border px-3 py-2 ${borderColor} hover:bg-background-gray-primary`}>
      <div className="flex min-w-0 items-start gap-2 sm:items-center">
        <ModelIcon modelId={model.id || fullModel} testStatus={testStatus} size={16} className="mt-0.5 sm:mt-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <code className="w-fit max-w-full break-all rounded bg-background-soft-50 px-1.5 py-0.5 font-mono text-xs text-text-secondary sm:max-w-[360px] sm:truncate">{displayModel}</code>
          </div>
          <span className="flex min-w-0 items-center text-[9px] gap-1 pl-1">
            {model.name && <span className="break-all sm:truncate text-[9px] italic text-text-secondary/70">{model.name}</span>}
            <CapacityBadges caps={caps} colorOverride="text-text-secondary/70" size={12} />
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          {onTest && (
            <div className="relative shrink-0 group/btn">
              <button
                onClick={onTest}
                disabled={isTesting}
                aria-label="Test model"
                className={`rounded p-0.5 text-text-secondary transition-opacity hover:bg-background-soft-50 hover:text-primary-500 ${isTesting ? "opacity-100" : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"}`}
              >
                <Icon name={isTesting ? "progress_activity" : "science"} className="size-3.5" style={isTesting ? { animation: "spin 1s linear infinite" } : undefined} />
              </button>
              <span className="pointer-events-none absolute mt-1 top-5 left-1/2 -translate-x-1/2 text-[10px] text-text-secondary whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity">
                {isTesting ? "Testing..." : "Test"}
              </span>
            </div>
          )}
          <div className="relative shrink-0 group/btn">
            <button
              onClick={() => onCopy(displayModel, `model-${model.id}`)}
              className="rounded p-0.5 text-text-secondary hover:bg-background-soft-50 hover:text-primary-500"
            >
              <Icon name={copied === `model-${model.id}` ? "check" : "content_copy"} className="size-3.5" />
            </button>
            <span className="pointer-events-none absolute mt-1 top-5 left-1/2 -translate-x-1/2 text-[10px] text-text-secondary whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity">
              {copied === `model-${model.id}` ? "Copied!" : "Copy"}
            </span>
          </div>
          {isCustom ? (
            <button
              onClick={onDeleteAlias}
              className="rounded p-0.5 text-text-secondary opacity-100 transition-opacity hover:bg-error-500/10 hover:text-error-500 sm:opacity-0 sm:group-hover:opacity-100"
              title="Remove custom model"
            >
              <Icon name="close" className="size-3.5" />
            </button>
          ) : onDisable ? (
            <button
              onClick={onDisable}
              className="rounded p-0.5 text-text-secondary opacity-100 transition-opacity hover:bg-error-500/10 hover:text-error-500 sm:opacity-0 sm:group-hover:opacity-100"
              title="Disable this model"
            >
              <Icon name="close" className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

ModelRow.propTypes = {
  model: PropTypes.shape({
    id: PropTypes.string.isRequired,
  }).isRequired,
  fullModel: PropTypes.string.isRequired,
  alias: PropTypes.string,
  copied: PropTypes.string,
  onCopy: PropTypes.func.isRequired,
  testStatus: PropTypes.oneOf(["ok", "error"]),
  isCustom: PropTypes.bool,
  isFree: PropTypes.bool,
  onDeleteAlias: PropTypes.func,
  onTest: PropTypes.func,
  isTesting: PropTypes.bool,
  onDisable: PropTypes.func,
  caps: PropTypes.object,
  thinkingSuffix: PropTypes.string,
};
