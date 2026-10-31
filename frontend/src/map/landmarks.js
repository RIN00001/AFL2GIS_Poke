// Presentation only. Pin coordinates always come from the showcase export.
export const landmarkMedia = {
  'UC Main Building': {
    image:'/public/landmarks/uc-main.jpg', type:'CAMPUS LANDMARK', short:'UC Main',
    caption:'Universitas Ciputra campus courtyard', credit:'Universitas Ciputra',
    source:'https://www.ciputra.ac.id/inilah-beberapa-universitas-swasta-di-surabaya-kamu-pilih-yang-mana/',
    description:'Start your campus expedition here. Look for your first discovery around the main building.'
  },
  'UC Tower': {
    image:'/public/landmarks/uc-tower.jpg', type:'CAMPUS LANDMARK', short:'UC Tower',
    caption:'Student lounge inside UC Tower', credit:'Universitas Ciputra',
    source:'https://www.ciputra.ac.id/students-lounge-baru-uc-tower-yang-sarat-dengan-seni/',
    description:'A new perspective on campus. This photo shows the student lounge inside the tower.'
  },
  'Hokky Supermarket': {
    image:'/public/landmarks/hokky.jpg', type:'NEIGHBOURHOOD STOP', short:'Hokky',
    caption:'Hokky CitraLand opening · 2024', credit:'Erajaya',
    source:'https://www.erajaya.com/news/gerai-terbaru-hokky-di-citraland-surabaya-resmi-dibuka',
    description:'Your eastern destination. Explore the supermarket area and keep an eye out for a fiery discovery.'
  },
  'UC LOOP': {
    image:'/public/landmarks/loop.svg', type:'CAMPUS STOP', short:'UC LOOP',
    caption:'Original stop illustration · not a site photograph',
    description:'A quiet stop on the western edge of the campus. Drop by and collect a stamp for your journey.'
  },
  'UC Hill Parking': {
    image:'/public/landmarks/parking.svg', type:'OPEN-AIR STOP', short:'Hill Parking',
    caption:'Original parking illustration · not a site photograph',
    description:'An open parking area, marked as a point on the map. There is no building footprint here.'
  }
};

export function mediaFor(landmark) {
  return landmarkMedia[landmark.id] || {image:'/public/landmarks/loop.svg', short:landmark.name,
    type:'FIELD STOP', caption:'Map illustration', description:landmark.description};
}
