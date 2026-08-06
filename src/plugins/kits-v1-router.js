import { authenticate } from '../routes/kits-v1/authenticate-data.js'
import { bank } from '../routes/kits-v1/bank.js'
import { land } from '../routes/kits-v1/land.js'
import { notifications } from '../routes/kits-v1/messages.js'
import { organisation } from '../routes/kits-v1/organisation.js'
import { permissions } from '../routes/kits-v1/permissions.js'
import { person } from '../routes/kits-v1/person.js'
import { sitiagri } from '../routes/kits-v1/siti-agri.js'
import { referenceData } from '../routes/kits-v1/reference-data.js'

const router = {
  plugin: {
    name: 'kits-router',
    register: (server, _options) => {
      server.route([
        ...person,
        ...organisation,
        ...authenticate,
        ...sitiagri,
        ...permissions,
        ...notifications,
        ...land,
        ...bank,
        ...referenceData
      ])
    }
  }
}

export { router }
