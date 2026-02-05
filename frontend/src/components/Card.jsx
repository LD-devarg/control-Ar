
import { motion } from 'motion/react'

function Card({ title, value, subtitle, accentClass }) {
  return (
    <motion.div className={`${accentClass || ''}  flex flex-col h-20 w-50 md:w-45 border border-gray-500 shadow-lg shadow-black bg-neutral-900 rounded-xl ps-4 pt-2 mb-4` .trim()}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.2 }}
      
    >
      <h2 className="text-white text-lg font-semibold">{title}</h2>
      <div className='flex flex-row'>
      {subtitle ? <span className="flex text-white mr-2 items-end text-sm md:text-base">{subtitle}</span> : null}<span className="text-blue-500 text-xl md:text-lg font-bold">{value}</span>
      </div>
    </motion.div>
  );
}

export default Card;
