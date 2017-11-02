const config = require('./config')
const fastify = require('fastify')()
const r2 = require('r2')
const mongoose = require('mongoose')
mongoose.connect('mongodb://localhost/weapp')
mongoose.Promise = global.Promise;

const crypto = require('crypto')
const md5 = str => crypto.createHash('md5').update(str).digest('hex')

const WXBizDataCrypt = require('./WXBizDataCrypt')

/**
 * Session Modal
 */
const Session = mongoose.model('Session', {
  session_id: String,
  openid: String,
  session_key: String,
  unionid: String,
})

fastify.get('/session/id', async (request, reply) => {
  reply.type('application/json').code(200)
  const { code } = request.query
  const ret = await r2(`https://api.weixin.qq.com/sns/jscode2session?appid=${config.AppID}&secret=${config.AppSecret}&js_code=${code}&grant_type=authorization_code`).json
  const { openid, session_key, unionid } = ret
  console.log(openid + session_key + unionid)
  const session_id = md5(openid + session_key + unionid)
  const session = new Session({ session_id, openid, session_key, unionid })
  await session.save()
  return { session_id }
  // console.log(ret)
  // return { }
})

fastify.get('/group/id', async (request, reply) => {
  reply.type('application/json').code(200)
  const { encryptedData, iv } = request.query
  const { authorization: session_id } = request.headers
  const session = await Session.findOne({ session_id })
  const { openid, session_key } = session
  const pc = new WXBizDataCrypt(config.AppID, session_key)
  const data = pc.decryptData(encryptedData, iv)
  const { openGId } = data
  return { openGId }
})


fastify.listen(3000, err => {
  if (err) throw err
  console.log(`server listening on ${fastify.server.address().port}`)
})
