import { HeroContent } from "@/components/hero/hero-content";
import styles from "@/components/hero/hero-v2.module.css";

export function HeroV2() {
  return (
    <section aria-label="The Get" className={styles.hero}>
      <div className={styles.heroMedia}>
        <picture>
          <source media="(min-width: 1024px)" srcSet="/hero-wide-v3.png" />
          <img
            src="/hero-mobile.png"
            alt=""
            className={styles.heroBackground}
            fetchPriority="high"
            decoding="async"
          />
        </picture>
      </div>

      <div className={styles.heroOverlay} aria-hidden />

      <div className={styles.heroInner}>
        <div className={styles.heroContent}>
          <HeroContent />
        </div>
      </div>
    </section>
  );
}
