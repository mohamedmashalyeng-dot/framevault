/**
 * <tally-pricing> — a neo-brutalist pricing table as a Web Component.
 *
 * Plans are read from a child <script type="application/json"> so the
 * markup stays declarative and server-renderable. Attributes:
 *   currency       ISO currency code used for formatting (default "USD")
 *   locale         BCP 47 locale for number formatting (default "en-US")
 *   billing        "monthly" | "yearly" initial billing period (default "monthly")
 *   yearly-discount  percentage taken off yearly prices (default 20)
 *
 * Events:
 *   plan-select    detail: { id, name, billing, price }
 *   billing-change detail: { billing }
 */

const template = document.createElement("template");
template.innerHTML = /* html */ `
  <style>
    :host {
      --tp-ink: #111111;
      --tp-paper: #fffdf5;
      --tp-accent: #ffd23f;
      --tp-accent-2: #ff6b9a;
      --tp-accent-3: #5ab8ff;
      --tp-radius: 14px;
      --tp-shadow: 6px 6px 0 var(--tp-ink);
      display: block;
      color: var(--tp-ink);
      font-family: "Archivo", "Arial Black", "Helvetica Neue", Arial, sans-serif;
    }
    * { box-sizing: border-box; }
    .bar {
      display: flex; align-items: center; justify-content: center; gap: 14px;
      margin-bottom: 36px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; font-size: 14px;
    }
    .switch {
      position: relative; width: 74px; height: 38px; border: 3px solid var(--tp-ink); border-radius: 999px;
      background: var(--tp-paper); box-shadow: 3px 3px 0 var(--tp-ink); cursor: pointer; padding: 0;
    }
    .switch::after {
      content: ""; position: absolute; top: 4px; left: 4px; width: 24px; height: 24px; border-radius: 50%;
      background: var(--tp-ink); transition: transform .2s ease;
    }
    .switch[aria-checked="true"] { background: var(--tp-accent); }
    .switch[aria-checked="true"]::after { transform: translateX(36px); }
    .save { background: var(--tp-accent-2); border: 3px solid var(--tp-ink); padding: 4px 10px; border-radius: 999px; font-size: 12px; }
    .grid { display: grid; gap: 28px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); align-items: stretch; }
    .card {
      display: flex; flex-direction: column; background: var(--tp-paper); border: 3px solid var(--tp-ink);
      border-radius: var(--tp-radius); box-shadow: var(--tp-shadow); padding: 26px; transition: transform .15s ease, box-shadow .15s ease;
    }
    .card:hover { transform: translate(-2px, -2px); box-shadow: 8px 8px 0 var(--tp-ink); }
    .card[data-featured] { background: var(--tp-accent); }
    .tag {
      align-self: flex-start; font-size: 12px; font-weight: 800; text-transform: uppercase; border: 3px solid var(--tp-ink);
      background: var(--tp-accent-3); padding: 4px 10px; border-radius: 999px; margin-bottom: 14px;
    }
    h3 { margin: 0; font-size: 26px; font-weight: 900; text-transform: uppercase; letter-spacing: -.01em; }
    .blurb { margin: 8px 0 0; font-family: system-ui, sans-serif; font-size: 15px; line-height: 1.45; }
    .price { margin: 22px 0 4px; font-size: 52px; font-weight: 900; line-height: 1; letter-spacing: -.03em; }
    .per { font-size: 15px; font-weight: 700; }
    .note { min-height: 1.4em; margin: 0; font-family: system-ui, sans-serif; font-size: 13px; }
    ul { list-style: none; margin: 22px 0 26px; padding: 0; display: grid; gap: 10px; font-family: system-ui, sans-serif; font-size: 15px; }
    li { display: flex; gap: 10px; align-items: flex-start; }
    li::before { content: "✓"; flex: none; display: grid; place-items: center; width: 22px; height: 22px; border: 2px solid var(--tp-ink); border-radius: 6px; background: var(--tp-paper); font-weight: 900; font-size: 13px; }
    button.cta {
      margin-top: auto; font: inherit; font-weight: 900; text-transform: uppercase; letter-spacing: .03em; font-size: 15px;
      padding: 14px 18px; border: 3px solid var(--tp-ink); border-radius: 10px; background: var(--tp-ink); color: var(--tp-paper);
      box-shadow: 4px 4px 0 var(--tp-accent-2); cursor: pointer; transition: transform .1s ease, box-shadow .1s ease;
    }
    .card[data-featured] button.cta { box-shadow: 4px 4px 0 var(--tp-paper); }
    button.cta:active { transform: translate(3px, 3px); box-shadow: 1px 1px 0 var(--tp-accent-2); }
    button:focus-visible { outline: 3px solid var(--tp-accent-3); outline-offset: 3px; }
    @media (prefers-reduced-motion: reduce) {
      .card, .switch::after, button.cta { transition: none; }
    }
  </style>
  <div class="bar">
    <span id="monthly-label">Monthly</span>
    <button class="switch" role="switch" aria-labelledby="monthly-label yearly-label" aria-checked="false"></button>
    <span id="yearly-label">Yearly</span>
    <span class="save" part="save"></span>
  </div>
  <div class="grid" part="grid"></div>
`;

class TallyPricing extends HTMLElement {
  static observedAttributes = ["billing", "currency", "locale", "yearly-discount"];

  #plans = [];
  #root;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: "open" });
    this.#root.appendChild(template.content.cloneNode(true));
    this.#root.querySelector(".switch").addEventListener("click", () => {
      this.billing = this.billing === "yearly" ? "monthly" : "yearly";
      this.dispatchEvent(new CustomEvent("billing-change", { detail: { billing: this.billing }, bubbles: true }));
    });
  }

  connectedCallback() {
    const source = this.querySelector('script[type="application/json"]');
    try {
      this.#plans = source ? JSON.parse(source.textContent || "[]") : [];
    } catch (error) {
      console.error("<tally-pricing>: invalid plans JSON", error);
      this.#plans = [];
    }
    this.#render();
  }

  attributeChangedCallback() {
    if (this.isConnected) this.#render();
  }

  get billing() {
    return this.getAttribute("billing") === "yearly" ? "yearly" : "monthly";
  }

  set billing(value) {
    this.setAttribute("billing", value === "yearly" ? "yearly" : "monthly");
  }

  get plans() {
    return [...this.#plans];
  }

  set plans(value) {
    this.#plans = Array.isArray(value) ? value : [];
    this.#render();
  }

  #discount() {
    const n = Number(this.getAttribute("yearly-discount") ?? 20);
    return Number.isFinite(n) ? Math.min(Math.max(n, 0), 90) : 20;
  }

  #format(amount) {
    return new Intl.NumberFormat(this.getAttribute("locale") || "en-US", {
      style: "currency",
      currency: this.getAttribute("currency") || "USD",
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  }

  #price(plan) {
    const monthly = Number(plan.monthly) || 0;
    if (this.billing === "monthly") return monthly;
    return Math.round(monthly * (1 - this.#discount() / 100) * 100) / 100;
  }

  #render() {
    const yearly = this.billing === "yearly";
    this.#root.querySelector(".switch").setAttribute("aria-checked", String(yearly));
    this.#root.querySelector(".save").textContent = `Save ${this.#discount()}%`;

    const grid = this.#root.querySelector(".grid");
    grid.replaceChildren(
      ...this.#plans.map((plan) => {
        const price = this.#price(plan);
        const card = document.createElement("article");
        card.className = "card";
        card.setAttribute("part", "card");
        if (plan.featured) card.dataset.featured = "";

        if (plan.badge) card.append(el("span", "tag", plan.badge));
        card.append(el("h3", "", plan.name));
        card.append(el("p", "blurb", plan.description || ""));

        const priceEl = el("p", "price", price === 0 ? "Free" : this.#format(price));
        if (price !== 0) priceEl.append(el("span", "per", " /mo"));
        card.append(priceEl);
        card.append(el("p", "note", yearly && price !== 0 ? `${this.#format(price * 12)} billed yearly` : ""));

        const list = document.createElement("ul");
        for (const feature of plan.features || []) list.append(el("li", "", feature));
        card.append(list);

        const cta = el("button", "cta", plan.cta || `Choose ${plan.name}`);
        cta.type = "button";
        cta.setAttribute("part", "cta");
        cta.addEventListener("click", () => {
          this.dispatchEvent(
            new CustomEvent("plan-select", {
              detail: { id: plan.id, name: plan.name, billing: this.billing, price },
              bubbles: true,
              composed: true,
            }),
          );
        });
        card.append(cta);
        return card;
      }),
    );
  }
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = text;
  return node;
}

if (!customElements.get("tally-pricing")) customElements.define("tally-pricing", TallyPricing);

export { TallyPricing };
