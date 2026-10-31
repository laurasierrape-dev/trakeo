// Verifica que el runner de tests (vitest) está correctamente configurado
// antes de confiar en el resto de la suite.
import { describe, it, expect } from 'vitest'

describe('toolchain de tests', () => {
  it('vitest corre', () => {
    expect(1 + 1).toBe(2)
  })
})
