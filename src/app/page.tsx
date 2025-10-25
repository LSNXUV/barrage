import Image from "next/image";
import styles from "./page.module.css";
import Barrage from "@/components/BarrageArea";

export default function Home() {
  return (
    <div className={styles.page}>
      <Barrage />
    </div>
  );
}
