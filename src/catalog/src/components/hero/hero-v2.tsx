import Image from "next/image";
import { HeroContent } from "@/components/hero/hero-content";
import styles from "@/components/hero/hero-v2.module.css";

export function HeroV2() {
  return (
    <section aria-label="The Get" className={styles.hero}>
      <div className={styles.heroMedia}>
        <Image
          src="/hero-wide-v3.png"
          alt=""
          fill
          priority
          unoptimized
          sizes="100vw"
          className={styles.heroBackground}
        />
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
