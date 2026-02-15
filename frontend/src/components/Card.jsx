
import { motion } from 'motion/react'

function Card({ title, value, subtitle, accentClass, icon, sizeHeight, sizeWidth }) {
  return (
    <motion.div className={`${accentClass || ''}  justify-self-start flex flex-col ${sizeHeight || ''} ${sizeWidth || ''} border border-gray-500 shadow-lg shadow-black bg-neutral-900 rounded-xl ps-4 pt-2` .trim()}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.2 }}
      
    >
      <div className="flex items-center">
        <h2 className="text-white text-md font-light">{title}</h2>
        <div className="flex grow justify-end items-center mr-4">
          <motion.div className="w-2 h-2 bg-green-500 rounded-full ml-2 mb-1"
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>
      </div>
      <div className='flex flex-row'>
        {subtitle ? <span className="flex text-white mr-2 items-end text-sm md:text-base">{subtitle}</span> : null}<span className="text-blue-500 text-xl md:text-lg font-bold">{value}</span>
        <div className="flex grow justify-end items-center mr-4">
            <div className='flex items-center gap-1 text-white bg-zinc-700 px-2 py-1 rounded text-sm'>
              {icon}
            </div>
        </div>
      </div>
    </motion.div>
  );
}

export default Card;
