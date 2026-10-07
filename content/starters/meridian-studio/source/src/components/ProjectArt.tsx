import type { Project } from "../data/projects";

/** Abstract architectural drawing used in place of photography. */
export function ProjectArt({ project, className = "" }: { project: Project; className?: string }) {
  const [ground, accent, ink] = project.palette;
  return (
    <svg viewBox="0 0 400 300" className={className} role="img" aria-label={`${project.name}, illustrative elevation`}>
      <rect width="400" height="300" fill={ground} />
      <circle cx="318" cy="74" r="34" fill={accent} opacity="0.85" />
      {project.shape === "terrace" && (
        <g fill="none" stroke={ink} strokeWidth="2">
          <path d="M40 230h320" />
          <path d="M60 230v-60h110v-30h100v90" fill={ground} />
          <path d="M60 170l55-38 55 38M170 140l50-34 50 34" />
          <path d="M90 230v-36h28v36M200 230v-52h44v52" />
        </g>
      )}
      {project.shape === "vault" && (
        <g fill="none" stroke={ink} strokeWidth="2">
          <path d="M30 236h340" />
          <path d="M70 236V150a130 70 0 0 1 260 0v86" fill={ground} />
          {[110, 150, 190, 230, 270].map((x) => (
            <path key={x} d={`M${x} 236v-70`} opacity="0.6" />
          ))}
          <path d="M70 150h260" />
        </g>
      )}
      {project.shape === "tower" && (
        <g fill="none" stroke={ink} strokeWidth="2">
          <path d="M30 240h340" />
          <path d="M80 240V120l60-30 60 30v120" fill={ground} />
          <path d="M200 240V140h130v100" fill={ground} />
          {[150, 175, 200, 225].map((y) => (
            <path key={y} d={`M215 ${y}h100`} opacity="0.55" />
          ))}
          <path d="M120 240v-50h40v50" />
        </g>
      )}
      {project.shape === "courtyard" && (
        <g fill="none" stroke={ink} strokeWidth="2">
          <path d="M40 232h320" />
          <path d="M60 232v-70l40-28 40 28v70M260 232v-70l40-28 40 28v70" fill={ground} />
          <path d="M140 232v-40h120v40" />
          {[165, 200, 235].map((x) => (
            <g key={x}>
              <path d={`M${x} 232v-22`} />
              <circle cx={x} cy={200} r="12" fill={accent} opacity="0.5" stroke="none" />
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}
