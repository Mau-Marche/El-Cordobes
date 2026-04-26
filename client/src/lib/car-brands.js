/**
 * Marcas y modelos de autos comunes en Argentina.
 * Usado para autocompletar en el formulario de vehículos.
 */
export const CAR_BRANDS = {
  "Chevrolet": ["Agile","Astra","Aveo","Blazer","Camaro","Captiva","Cobalt","Corsa","Corsa Classic","Corsa Wind","Cruze","Equinox","Kadett","Montana","Onix","Onix Plus","Prisma","S10","Spin","Tracker","Trailblazer","Vectra","Zafira"],
  "Citroën": ["Aircross","Berlingo","C3","C3 Aircross","C4","C4 Cactus","C4 Lounge","C5","C5 Aircross","Dispatch","Jumpy","Picasso","Xantia","Xsara","ZX"],
  "Fiat": ["Argo","Bravo","Cronos","Doblò","Ducato","Fiorino","Grand Siena","Idea","Linea","Marea","Mobi","Palio","Palio Adventure","Palio Weekend","Punto","Qubo","Scudo","Siena","Strada","Toro","Uno"],
  "Ford": ["Bronco","Connect","Courier","EcoSport","Edge","Escape","Escort","Expedition","Explorer","F-100","F-150","Fiesta","Fiesta Kinetic","Focus","Fusion","Galaxy","Ka","Kuga","Maverick","Mondeo","Mustang","Orion","Puma","Ranger","Territory"],
  "Honda": ["Accord","City","Civic","CR-V","CR-Z","Fit","HR-V","Jazz","Odyssey","Pilot","WR-V"],
  "Hyundai": ["Accent","Creta","Elantra","Getz","H100","H1","i10","i20","i30","ix35","Sonata","Tucson","Veloster"],
  "Kia": ["Carnival","Cerato","Morning","Picanto","Rio","Seltos","Sorento","Soul","Sportage","Stinger"],
  "Nissan": ["Frontier","Kicks","Leaf","March","Murano","Note","Patrol","Pathfinder","Qashqai","Sentra","Tiida","Versa","X-Trail"],
  "Peugeot": ["106","107","206","207","208","3008","301","306","307","308","408","5008","Partner","Rifter","Expert"],
  "Renault": ["Captur","Clio","Duster","Fluence","Kangoo","Koleos","Kwid","Logan","Megane","Oroch","Sandero","Scenic","Symbol","Trafic"],
  "Toyota": ["Camry","Corolla","Corolla Cross","Etios","FJ Cruiser","Fortuner","Hiace","Highlander","Hilux","Land Cruiser","Prius","RAV4","SW4","Yaris"],
  "Volkswagen": ["Amarok","Bora","CrossFox","Fox","Gol","Golf","Jetta","Passat","Polo","Suran","T-Cross","Taos","Tiguan","Touareg","Vento","Virtus","Voyage"],
  "Mercedes-Benz": ["A 180","A 200","C 180","C 200","C 220","C 250","CLA","E 200","E 220","GLA","GLC","GLE","Sprinter","Vito"],
  "BMW": ["116i","118i","120i","125i","218i","320i","330i","420i","520i","530i","X1","X3","X5","Z4"],
  "Audi": ["A1","A3","A4","A5","A6","A7","Q2","Q3","Q5","Q7","TT"],
  "Jeep": ["Cherokee","Commander","Compass","Gladiator","Grand Cherokee","Renegade","Wrangler"],
  "Mitsubishi": ["ASX","Eclipse Cross","Galant","L200","Lancer","Montero","Outlander","Pajero"],
  "Suzuki": ["Alto","Baleno","Grand Vitara","Ignis","Jimny","S-Cross","Swift","Vitara"],
  "Subaru": ["Forester","Impreza","Legacy","Outback","XV"],
  "Volvo": ["S40","S60","S80","S90","V40","V60","V90","XC40","XC60","XC90"],
  "Alfa Romeo": ["147","156","159","Giulia","Giulietta","MiTo","Stelvio"],
  "Mazda": ["2","3","6","CX-3","CX-5","CX-9","MX-5"],
  "Mini": ["Cooper","Countryman","Paceman"],
  "Ram": ["700","1500","2500","3500","Rampage"],
  "Dodge": ["Challenger","Charger","Durango","Journey","Neon"],
  "Chery": ["Arrizo 3","Arrizo 5","Arrizo 6","Beat","QQ","Tiggo 2","Tiggo 3","Tiggo 5X","Tiggo 7","Tiggo 8"],
  "BAIC": ["BJ20","BJ40","X25","X35","X55","X65"],
  "Great Wall": ["C30","Haval H1","Haval H2","Haval H6","Wingle"],
  "Geely": ["Azkarra","Coolray","Emgrand","MK"],
  "Otras": [],
};

export const BRAND_NAMES = Object.keys(CAR_BRANDS).sort();

export function getModels(brand) {
  return (CAR_BRANDS[brand] || []).sort();
}
