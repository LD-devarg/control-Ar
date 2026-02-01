import '../assets/css/Card.css';

function Card({ title, value, subtitle, icon, accentClass }) {
  return (
    <div className={`card ${accentClass || ''}`.trim()}>
      {icon ? <span className="card-icon">{icon}</span> : null}
      <h2 className="card-title">{title}</h2>
      {subtitle ? <span className="card-subtitle">{subtitle}</span> : null}<span className="card-value">{value}</span>
    </div>
  );
}

export default Card;
