import type { CSSProperties } from "react"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ theme = "light", ...props }: ToasterProps) => {
  return (
    <Sonner
      theme={theme}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-[#7C3AED]" strokeWidth={2} />,
        info: <InfoIcon className="size-4 text-[#09090B]" strokeWidth={2} />,
        warning: <TriangleAlertIcon className="size-4 text-[#09090B]" strokeWidth={2} />,
        error: <OctagonXIcon className="size-4 text-[#FF4D8D]" strokeWidth={2} />,
        loading: <Loader2Icon className="size-4 animate-spin text-[#7C3AED]" strokeWidth={2} />,
      }}
      style={
        {
          "--normal-bg": "#FFFFFF",
          "--normal-text": "#09090B",
          "--normal-border": "#09090B",
          "--border-radius": "0.875rem",
        } as CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "cn-toast !border-[2.5px] !border-[#09090B] !shadow-[4px_4px_0_#09090B] !bg-[#FFFFFF] !text-[#09090B] font-sans",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
