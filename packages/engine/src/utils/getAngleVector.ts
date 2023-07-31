import Matter from 'matter-js'

const getAngleVector = (body: Matter.Body): Matter.Vector => {
  return Matter.Vector.create(Math.cos(body.angle), Math.sin(body.angle))
}

export default getAngleVector
