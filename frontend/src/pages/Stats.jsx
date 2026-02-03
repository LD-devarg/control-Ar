import '../assets/css/Stats.css';
import Filter from '../components/Filter';
import Card from '../components/Card';
import GraficoLineas from '../components/GraficoLineas';
import TablaKPI from '../components/TablaPorcentajes.jsx';

function Stats() {
  return (
    <div className="stats-layout">
      <div className="stats-container">
        <h1>Estadisticas</h1>
        <Filter className="filter-bar-container" />
        <div className="cards-container">
          <Card
            title="Web Visitors"
            value="180"
            accentClass="card-accent-purple"
          />
          <Card
            title="Leads"
            value="135"
            accentClass="card-accent-orange"
          />
          <Card
            title="Contactos"
            value="75"
            accentClass="card-accent-blue"
            />
          <Card
            title="Compras"
            subtitle={"32"}
            value="$500.000"
            accentClass="card-accent-green"
          />
        </div>
        <div className='below-container'>
          <div className="chart-container">
            <div className="chart-box">
              <span>Compras</span>
              <GraficoLineas />
            </div>
            <div className="chart-box">
              <span>Gastos</span>
              <GraficoLineas />
            </div>          
          </div>
          <div className='porcentaje-container'>
            <div className='porcentaje-box'>
              <TablaKPI />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Stats;
