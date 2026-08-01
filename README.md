# 3DPrint Calc - Calculadora de Impresión 3D y Cotizaciones

Una aplicación web moderna, rápida e interactiva pensada para emprendedores y creadores de impresiones 3D. Permite calcular con precisión el valor de venta de cualquier pieza 3D a partir de un archivo **.STL** o un **enlace web** (Thingiverse, Printables, Cults3D), desglosando los costos de plástico, electricidad, desgaste de máquina, mano de obra y margen de ganancia.

Diseñada con interfaz fluida y responsive, optimizada para desplegar en **Vercel** y usar desde el celular o la computadora.

---

## 🌟 Características Principales

1. **Visualizador 3D e Inspector STL**:
   - Carga interactiva de archivos `.STL` con tecnología Three.js.
   - Cálculo automático de dimensiones reales ($X \times Y \times Z$ en mm), volumen ($cm^3$), superficie y peso estimado en gramos ($g$).
   - Soporte para diferentes materiales y densidades: PLA, PETG, ABS, TPU y Resina.
   - Selector dinámico de porcentaje de relleno (*Infill* 0% - 100%).

2. **Importador desde Enlaces Web**:
   - Pega URLs de **Thingiverse**, **Printables** o **Cults3D** para extraer automáticamente el nombre y datos del modelo.

3. **Cálculo Completo de Costos y Ganancia**:
   - **Filamento**: Basado en el precio por spool/kg y peso de la pieza.
   - **Electricidad**: Basado en la potencia de la impresora ($Watts$), horas de impresión y costo del $kWh$.
   - **Desgaste / Amortización**: Costo por hora de desgaste de boquilla, correas y vida útil de la impresora.
   - **Mano de Obra / Setup**: Tiempo de laminado, remoción de soportes y post-procesado.
   - **Margen de Fallas / Riesgo**: Porcentaje de resguardo ante fallas de impresión.
   - **Precio Mínimo de Breakeven y Precio de Venta Sugerido**: Ajuste por slider de margen de beneficio (%).

4. **Herramientas de Venta y Persistencia**:
   - **Cotizador para WhatsApp**: Botón *"Copiar Resumen para Cliente"* que genera un texto listo con formato para enviar al cliente.
   - **Selector de Monedas**: Compatible con USD, ARS, EUR, MXN, CLP, COP y PEN.
   - **Perfiles Guardados**: Tus preferencias de costo de luz, precios de filamentos y monedas se guardan automáticamente en `localStorage`.

---

## 🚀 Despliegue en Vercel

Esta aplicación está 100% optimizada para desplegarse gratis en **Vercel**:

### Opción 1: Conectar con GitHub / GitLab
1. Sube esta carpeta a tu cuenta de GitHub.
2. Ve a [Vercel Dashboard](https://vercel.com/dashboard) y haz clic en **"Add New Project"**.
3. Importa tu repositorio. Vercel detectará automáticamente el archivo `vercel.json` y desplegará la app estática junto a la función serverless de Python en `/api/fetch-model`.
4. ¡Listo! Obtendrás una URL como `https://tu-calculadora-3d.vercel.app` para acceder desde tu celular o compartir con clientes.

### Opción 2: Usar Vercel CLI
```bash
npx vercel
```

---

## 💻 Ejecución Local en tu Computadora

Puedes probar la aplicación en tu computadora de 2 formas:

### Método A (Servidor de pruebas Python):
Abre una terminal en la carpeta del proyecto y ejecuta:
```bash
py dev.py
```
Abre en tu navegador: `http://localhost:8080` (también podrás ingresar desde tu celular usando la IP local de tu PC).

### Método B (Directo en navegador):
Simplemente haz doble clic en el archivo `index.html` para abrirlo en Chrome, Edge o Firefox.
