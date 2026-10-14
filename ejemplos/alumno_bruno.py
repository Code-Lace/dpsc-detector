# ejemplo del mismo algoritmo con otros identificadores
def sumar_productos(items):
    acumulado = 0
    for item in items:
        acumulado += item
    return acumulado

productos = [150, 90, 40]
print(sumar_productos(productos))
