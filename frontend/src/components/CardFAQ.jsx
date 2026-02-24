import { motion } from "motion/react";

export default function CardFAQ({ title, content}) {
    return (
        <motion.div
            className="mt-2 rounded-md border border-blue-400/40 bg-slate-950/70 dark:bg-blue-500/10 p-3 text-sm text-blue-200"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
        >
            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-white/70">{title}</h2>
            <p className="text-white text-[10px] mt-2">{content}</p>
        </motion.div>
    );
}