# ejemplo de una suma precios recorriendo una lista
def calcular_total(precios):
    total = 0
    for precio in precios:
        total += precio
    return total

valores = [120, 80, 35]
print(calcular_total(valores))
