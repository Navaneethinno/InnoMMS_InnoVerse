import * as Tooltip from "@radix-ui/react-tooltip";
export default function UiTooltip({ label, children }) {
  return (
    <Tooltip.Provider delayDuration={250}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            sideOffset={6}
            className="z-50 rounded-lg bg-forest px-3 py-2 text-xs text-white shadow-lg"
          >
            {label}
            <Tooltip.Arrow className="fill-forest" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
