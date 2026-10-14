# ejemplo de  un calculo del area de un circulo
import math

def area_circulo(radio):
    if radio <= 0:
        raise ValueError("El radio debe ser positivo")
    return math.pi * radio ** 2

print(area_circulo(4))
    