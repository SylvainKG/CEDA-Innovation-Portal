import { ArrowRight, CircleCheck } from "lucide-react";
import cedaLogo from "@/assets/ceda-logo.png";
import { ButtonLink } from "@/components";
import { PUBLIC_STAGES } from "@/lib/status";
import { ChallengeList } from "./ChallengeList";

/** One line per stage, as in Sandra's home page reference (ceda site homepage.pdf, 20 Nov). */
const STEP_TEXT: Record<string, string> = {
  submission: "Share your idea",
  review: "CEDA assesses it",
  feedback: "Respond if needed",
  approval: "Receive a decision",
  award: "Approved support recorded",
};

const Eyebrow = ({
  children,
  onDark = false,
}: {
  children: string;
  onDark?: boolean;
}) => (
  // On the dark band: brand orange #f58220 on #333333 is 4.7:1.
  <p
    className={`text-xs font-bold uppercase tracking-wider ${onDark ? "text-[#f58220]" : "text-brand-text"}`}
  >
    {children}
  </p>
);

/**
 * T01 public home (spec §7 T01), laid out to Sandra's reference (ceda site homepage.pdf): hero, "Find a problem
 * worth solving" with the challenge cards, and "From submission to award". The hero photo waits for the image file
 * and its licence; until then the frame shows the brand pattern. Every control is at least 44 × 44 px.
 */
export function PublicHome() {
  return (
    <div className="flex flex-col">
      <div className="bg-surface-card">
        <section
          aria-labelledby="intro"
          className="mx-auto grid w-full max-w-content grid-cols-1 items-center gap-10 px-4 py-10 md:grid-cols-2 md:py-16"
        >
          <div className="flex flex-col gap-5">
            <img
              src={cedaLogo}
              alt=""
              width={1432}
              height={900}
              className="h-16 w-auto self-start"
            />
            <Eyebrow>Advancing Botswana through innovation</Eyebrow>
            <h1
              id="intro"
              className="text-[2.5rem] font-normal leading-tight md:text-[3.25rem]"
            >
              Submit your innovation to CEDA
            </h1>
            <p className="max-w-form text-lg text-ink-muted">
              Discover challenges, submit practical ideas and contribute to
              Botswana’s economic transformation.
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink to="/auth/register">
                Register <ArrowRight aria-hidden className="h-4 w-4" />
              </ButtonLink>
              <ButtonLink to="/auth/sign-in" variant="secondary">
                Sign in
              </ButtonLink>
            </div>
          </div>
          <HeroFrame />
        </section>
      </div>

      <section
        aria-labelledby="challenges-heading"
        className="bg-surface-sunken"
      >
        <div className="mx-auto flex w-full max-w-content flex-col gap-6 px-4 py-12 md:py-16">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:items-end">
            <div className="flex flex-col gap-2">
              <Eyebrow>Open challenges</Eyebrow>
              <h2
                id="challenges-heading"
                className="text-[2rem] font-normal leading-tight"
              >
                Find a problem worth solving
              </h2>
            </div>
            <p className="text-ink-muted md:justify-self-end md:max-w-sm">
              Each challenge sets out a clear need, who can participate and how
              ideas are assessed.
            </p>
          </div>
          <ChallengeList />
        </div>
      </section>

      <section
        id="how-it-works"
        aria-labelledby="how-heading"
        // Always dark, in light and dark themes alike (the reference's band); white on #333333 is 12.6:1.
        className="bg-[#333333] text-white"
      >
        <div className="mx-auto flex w-full max-w-content flex-col items-center gap-8 px-4 py-12 md:py-16">
          <div className="flex flex-col items-center gap-2 text-center">
            <Eyebrow onDark>A clear, transparent process</Eyebrow>
            <h2
              id="how-heading"
              className="text-[2rem] font-normal leading-tight"
            >
              From submission to award
            </h2>
          </div>
          <ol className="relative grid w-full grid-cols-1 gap-6 md:grid-cols-5 md:gap-2">
            {/* The line joining the steps (desktop only; decorative). */}
            <span
              aria-hidden
              className="absolute left-[10%] right-[10%] top-5 hidden h-px bg-white/40 md:block"
            />
            {PUBLIC_STAGES.map((s, i) => (
              <li
                key={s.id}
                className="relative flex items-center gap-3 md:flex-col md:gap-2 md:text-center"
              >
                <span
                  aria-hidden
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-brand-on"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex flex-col">
                  <h3 className="font-semibold">{s.label}</h3>
                  <span className="text-sm opacity-80">{STEP_TEXT[s.id]}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}

/** The hero's framed picture: rounded frame on a soft brand backdrop with an accent corner, and the journey note. */
function HeroFrame() {
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-lg">
      <div className="absolute -bottom-3 -right-3 h-1/3 w-1/2 rounded-br-[2rem] bg-brand-accent" />
      <div className="relative rounded-[2.5rem] bg-brand-subtle p-3 md:p-4">
        <div className="aspect-[4/3] overflow-hidden rounded-[2rem] border-2 border-brand bg-[radial-gradient(circle_at_30%_30%,var(--brand-primary-subtle),transparent_60%),linear-gradient(135deg,var(--brand-primary),var(--brand-accent))]">
          <img
            src={cedaLogo}
            alt=""
            className="mx-auto mt-[18%] h-1/3 w-auto opacity-90 mix-blend-luminosity"
          />
        </div>
      </div>
      <div className="absolute -bottom-4 right-6 flex items-center gap-2 rounded-md bg-surface-card px-3 py-2 text-ink shadow-1">
        <CircleCheck className="h-5 w-5 text-brand-text" />
        <span className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">One connected journey</span>
          <span className="text-xs text-ink-muted">
            Idea to economic impact
          </span>
        </span>
      </div>
    </div>
  );
}

/** `/challenges`: the same list with its own page heading. */
export function ChallengesPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-h1 font-bold">Challenges</h1>
      <ChallengeList />
    </div>
  );
}
