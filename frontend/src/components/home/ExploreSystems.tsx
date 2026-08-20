import { Link } from "react-router-dom";
import { Activity, ArrowRight, Brain, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/FadeIn";

const SYSTEMS = [
  {
    icon: Activity,
    name: "Respiratory",
    desc: "Lungs, airways & breathing",
  },
  {
    icon: Heart,
    name: "Digestive",
    desc: "Stomach, intestines & metabolism",
  },
  {
    icon: Brain,
    name: "Nervous",
    desc: "Brain, nerves & spinal cord",
  },
];

export default function ExploreSystems() {
  return (
    <section
      aria-labelledby="explore-systems-heading"
      className="mt-12 py-4 md:mt-16"
    >
      <h2
        id="explore-systems-heading"
        className="mb-2 font-display text-lg font-medium text-pine"
      >
        Explore Diseases by Body System
      </h2>
      <p className="mb-6 max-w-xl text-sm leading-relaxed text-muted-foreground">
        Start with a part of the human body and discover the diseases
        associated with it.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        {SYSTEMS.map((sys, index) => (
          <FadeIn key={sys.name} delay={index * 0.1}>
            <Link
              to="/body-map"
              className="group flex items-center gap-4 rounded-lg border border-border/70 bg-card p-4 shadow-sm transition-colors hover:bg-secondary/40"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-pine">
                <sys.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="font-display text-base font-medium text-ink">
                  {sys.name}
                </p>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                  {sys.desc}
                </p>
              </div>
              <ArrowRight
                className="ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </FadeIn>
        ))}
      </div>
      <Button asChild size="lg" className="mt-6 w-full sm:w-auto">
        <Link to="/body-map">
          Explore Body Map
          <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </Link>
      </Button>
    </section>
  );
}