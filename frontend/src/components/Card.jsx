
import { motion } from "motion/react";

function Card({
  title,
  value,
  subtitle,
  accentClass,
  icon,
  sizeHeight,
  sizeWidth,
  textSize,
  variant = "classic",
}) {
  const isKpi = variant === "kpi";
  const rootClasses = isKpi
    ? "justify-self-start flex flex-col rounded-lg border border-white/15 bg-gradient-to-r from-black to-gray-900 px-4 py-3"
    : "justify-self-start flex flex-col shadow-lg shadow-black bg-gradient-to-r from-black to-gray-900 rounded-xl ps-4 pt-2";
  const titleClasses = isKpi ? "text-[11px] font-semibold uppercase tracking-wide text-white/70" : "text-white text-md font-light";
  const valueClasses = isKpi ? "text-cyan-300 font-semibold" : "text-blue-500 font-bold";
  const iconChipClasses = isKpi
    ? "flex items-center gap-1 text-cyan-200 border border-white/10 bg-black/55 px-2 py-1 rounded text-sm"
    : "flex items-center gap-1 text-white bg-zinc-700 px-2 py-1 rounded text-sm";

  return (
    <motion.div
      className={`${accentClass || ""} ${rootClasses} ${sizeHeight || ""} ${sizeWidth || ""}`.trim()}
      whileHover={{ scale: isKpi ? 1.01 : 1.05 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center">
        <h2 className={titleClasses}>{title}</h2>
        <div className="flex grow justify-end items-center">
          <motion.div
            className={`w-2 h-2 rounded-full ml-2 mb-1 ${isKpi ? "bg-cyan-300/90" : "bg-green-500"}`}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>
      </div>
      <div className="flex flex-row">
        {subtitle ? <span className="flex text-white mr-2 items-end text-[11px] md:text-[12px]">{subtitle}</span> : null}
        <span className={`${valueClasses} ${textSize || ""} mt-1`.trim()}>{value}</span>
        <div className="flex grow justify-end items-center">
          <div className={iconChipClasses}>{icon}</div>
        </div>
      </div>
    </motion.div>
  );
}

export default Card;
