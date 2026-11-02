import { Slider as SliderPrimitive } from "radix-ui"
import * as React from "react"

import { cn } from "@/lib/utils"

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  "aria-valuetext": ariaValueText,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const labelId = React.useId()
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max]
  )

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className={cn(
          "bg-muted relative grow overflow-hidden rounded-full data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5"
        )}
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className={cn(
            "bg-primary absolute data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"
          )}
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <React.Fragment key={index}>
          {_values.length > 1 && ariaLabelledBy && (
            <span id={`${labelId}-${index}`} className="sr-only">
              Valor {index + 1} de {_values.length}
            </span>
          )}
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            aria-label={
              ariaLabel
                ? `${ariaLabel}${_values.length > 1 ? ` — valor ${index + 1} de ${_values.length}` : ""}`
                : !ariaLabelledBy && _values.length > 1
                  ? `Valor ${index + 1} de ${_values.length}`
                  : undefined
            }
            aria-labelledby={
              ariaLabelledBy
                ? `${ariaLabelledBy}${_values.length > 1 ? ` ${labelId}-${index}` : ""}`
                : undefined
            }
            aria-describedby={ariaDescribedBy}
            aria-valuetext={ariaValueText}
            className="border-primary ring-ring/50 relative block size-4 shrink-0 rounded-full border bg-white shadow-sm transition-[color,box-shadow] after:absolute after:top-1/2 after:left-1/2 after:size-11 after:-translate-x-1/2 after:-translate-y-1/2 after:content-[''] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50"
          />
        </React.Fragment>
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
