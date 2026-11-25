import { DotLottieReact, setWasmUrl } from "@lottiefiles/dotlottie-react"
import { useEffect, useState, type ComponentProps } from "react"

import wasmUrl from "@lottiefiles/dotlottie-web/dotlottie-player.wasm?url"

import animationUrl from "./erpx-assistant.lottie?url"
import "./assistant-launch-button.css"

setWasmUrl(wasmUrl)

type PlayerCallback = NonNullable<ComponentProps<typeof DotLottieReact>["dotLottieRefCallback"]>

type AssistantLaunchButtonProps = {
  id?: string
  open: boolean
  busy?: boolean
  label: string
  panelId?: string
  onClick: () => void
  className?: string
}

function AssistantAnimation({ active, busy }: { active: boolean; busy: boolean }) {
  const [player, setPlayer] = useState<Parameters<PlayerCallback>[0]>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!player) return

    const showAnimation = () => setVisible(true)
    const showFallback = () => setVisible(false)
    player.addEventListener("render", showAnimation)
    player.addEventListener("loadError", showFallback)
    player.addEventListener("renderError", showFallback)
    player.addEventListener("complete", showFallback)

    return () => {
      player.removeEventListener("render", showAnimation)
      player.removeEventListener("loadError", showFallback)
      player.removeEventListener("renderError", showFallback)
      player.removeEventListener("complete", showFallback)
    }
  }, [player])

  return (
    <span className="erpx-assistant-launch__art" data-playing={visible}>
      <DotLottieReact
        className="erpx-assistant-launch__canvas"
        src={animationUrl}
        animationId={active ? "assistant-active" : "assistant-idle"}
        autoplay
        loop={busy}
        dotLottieRefCallback={setPlayer}
      />
    </span>
  )
}

export function AssistantLaunchButton({
  id,
  open,
  busy = false,
  label,
  panelId,
  onClick,
  className,
}: AssistantLaunchButtonProps) {
  const [reducedMotion, setReducedMotion] = useState(true)
  const active = open || busy

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)")
    const updatePreference = () => setReducedMotion(preference.matches)

    updatePreference()
    preference.addEventListener("change", updatePreference)
    return () => preference.removeEventListener("change", updatePreference)
  }, [])

  return (
    <button
      id={id}
      type="button"
      className={["erpx-assistant-launch", className].filter(Boolean).join(" ")}
      aria-label={label}
      aria-busy={busy}
      aria-expanded={open}
      aria-controls={panelId}
      data-busy={busy}
      onClick={onClick}
    >
      <span className="erpx-assistant-launch__fallback" aria-hidden="true">✦</span>
      {!reducedMotion && (
        <span aria-hidden="true">
          <AssistantAnimation
            key={busy ? "busy" : active ? "active" : "idle"}
            active={active}
            busy={busy}
          />
        </span>
      )}
    </button>
  )
}
