import Page from '../layouts/Page.jsx';
import Filter from '../components/Filter';
import Card from '../components/Card';
import GraficoLineas from '../components/GraficoLineas';
import TablaKPI from '../components/TablaKPI.jsx';

function Stats() {
  return (
        <Page title="Estadisticas"
        actions={<Filter />}
        >

        <div className="flex flex-wrap justify-center gap-5 w-9/10 border-b-1 dark:border-zinc-500 pb-5">
          <Card
            title="Web Visitors"
            value="180"
          />
          <Card
            title="Leads"
            value="135"
          />
          <Card
            title="Contactos"
            value="75"
            />
          <Card
            title="Compras"
            subtitle={"32"}
            value="$500.000"
          />
        </div>
        <div className='flex justify-center items-stretch gap-5 w-9/10 mt-5'>
          <div className="flex border-r-1 items-center dark:border-zinc-500 flex-col w-5/10 md:w-4/10 min-w-0 mb-0">
            <div className="flex flex-col mt-2 h-30 w-80">
              <span className='font-sm mb-1 text-gray-500'>Compras</span>
              <GraficoLineas />
            </div>
            <div className="flex flex-col mt-2 h-30 w-full justify-center md:w-80">
              <span className='font-sm mb-1 text-gray-500'>Gastos</span>
              <GraficoLineas />
            </div>          
          </div>
          <div className='flex flex-col w-5/10 md:w-6/10 min-w-0 mb-2'>
            <div className='w-full'>
              <TablaKPI />
            </div>
          </div>
        </div>
      </Page>
  );
}

export default Stats;
