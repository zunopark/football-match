/** 문단(string) / 번호 목록({ ol }) / 불릿 목록({ ul }) 중 하나 */
export type LegalBlock = string | { ol: string[] } | { ul: string[] };

export type LegalSection = {
  title: string;
  body: LegalBlock[];
};

export function LegalDocument({
  title,
  effectiveDate,
  intro,
  sections,
}: {
  title: string;
  effectiveDate: string;
  intro?: string;
  sections: LegalSection[];
}) {
  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">시행일: {effectiveDate}</p>
        {intro ? <p className="text-sm leading-relaxed">{intro}</p> : null}
      </header>

      {sections.map((section) => (
        <section key={section.title} className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">{section.title}</h2>
          {section.body.map((block, index) => (
            <LegalBlockView key={index} block={block} />
          ))}
        </section>
      ))}
    </article>
  );
}

function LegalBlockView({ block }: { block: LegalBlock }) {
  if (typeof block === "string") {
    return <p className="text-sm leading-relaxed text-muted-foreground">{block}</p>;
  }

  if ("ol" in block) {
    return (
      <ol className="ml-5 flex list-decimal flex-col gap-1.5 text-sm leading-relaxed text-muted-foreground">
        {block.ol.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    );
  }

  return (
    <ul className="ml-5 flex list-disc flex-col gap-1.5 text-sm leading-relaxed text-muted-foreground">
      {block.ul.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
