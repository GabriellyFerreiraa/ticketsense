# 🎫 TicketSense

An AI-powered support ticket triage system. Requesters describe their issue in plain language; Google Gemini automatically suggests a category, urgency level, and first diagnostic steps — the same first-response thinking a helpdesk analyst does manually, now assisted by AI.

🔗 **Live demo:** [add the link here after deploying]

![Project screenshot](public/screenshot.png)
<!-- Replace with a real screenshot of the Agent dashboard -->

---

## 🇬🇧 English

### About the project
Built to reflect real IT support/helpdesk experience: when a ticket comes in, an AI classification step reads the title and description and returns a category (hardware, software, network, access, other), an urgency level (low to critical), and 2-4 concrete first diagnostic steps — before any human even opens the ticket. Agents can always override the AI's read; the AI assists triage, it doesn't replace judgment.

### Features
- Role-based access: **Requester** (opens and tracks their own tickets) and **Agent** (works the full queue)
- AI-assisted triage on submission via a Supabase Edge Function calling the Gemini API — the API key never reaches the browser
- Agents can manually reclassify category/urgency and change ticket status
- Row Level Security enforcing that requesters only ever see their own tickets
- Graceful degradation: if the AI call fails, the ticket is still created and flagged for manual classification

### Tech stack
- React + TypeScript, Vite
- Tailwind CSS + shadcn/ui
- Supabase (PostgreSQL, Auth, Row Level Security, Edge Functions)
- Google Gemini API for ticket classification

### Running locally
```bash
git clone https://github.com/GabriellyFerreiraa/ticketsense.git
cd ticketsense
npm install
npm run dev
```
This project connects to a live Supabase project and calls the Gemini API through a Supabase Edge Function, so both need to be configured (see below) for full functionality.

### Setting it up from scratch
1. Create a Supabase project and run the migration in `supabase/migrations/` via the SQL Editor
2. Copy your Project URL and anon key into `src/integrations/supabase/client.ts`
3. Get a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey), then deploy the Edge Function and set the secret:
   ```bash
   supabase functions deploy classify-ticket
   supabase secrets set GEMINI_API_KEY=your_key_here
   ```

---

## 🇪🇸 Español

### Sobre el proyecto
Creado para reflejar experiencia real en soporte técnico/helpdesk: cuando llega un ticket, un paso de clasificación con IA lee el título y la descripción y devuelve una categoría (hardware, software, red, acceso, otro), un nivel de urgencia (bajo a crítico) y de 2 a 4 pasos concretos de diagnóstico inicial — antes de que un humano siquiera abra el ticket. Los agentes siempre pueden corregir la lectura de la IA; la IA asiste en la clasificación, no reemplaza el criterio.

### Funcionalidades
- Acceso según rol: **Requester** (abre y sigue sus propios tickets) y **Agent** (trabaja toda la cola)
- Triage asistido por IA al enviar el ticket, mediante una Supabase Edge Function que llama a la API de Gemini — la clave de API nunca llega al navegador
- Los agentes pueden reclasificar manualmente categoría/urgencia y cambiar el estado del ticket
- Row Level Security asegurando que cada requester solo vea sus propios tickets
- Degradación elegante: si falla la llamada a la IA, el ticket se crea igual y queda marcado para clasificación manual

### Tecnologías utilizadas
- React + TypeScript, Vite
- Tailwind CSS + shadcn/ui
- Supabase (PostgreSQL, Auth, Row Level Security, Edge Functions)
- Google Gemini API para clasificación de tickets

### Cómo ejecutar localmente
```bash
git clone https://github.com/GabriellyFerreiraa/ticketsense.git
cd ticketsense
npm install
npm run dev
```
Este proyecto se conecta a un proyecto real de Supabase y llama a la API de Gemini a través de una Supabase Edge Function, así que ambos deben configurarse (ver abajo) para el funcionamiento completo.

### Configurarlo desde cero
1. Crea un proyecto de Supabase y corre la migration de `supabase/migrations/` desde el SQL Editor
2. Copia tu Project URL y anon key en `src/integrations/supabase/client.ts`
3. Consigue una API key gratis en [Google AI Studio](https://aistudio.google.com/app/apikey), luego despliega la Edge Function y configura el secreto:
   ```bash
   supabase functions deploy classify-ticket
   supabase secrets set GEMINI_API_KEY=tu_clave_aqui
   ```

---

## 🇧🇷 Português

### Sobre o projeto
Criado pra refletir experiência real em suporte técnico/helpdesk: quando um chamado chega, uma etapa de classificação com IA lê o título e a descrição e retorna uma categoria (hardware, software, rede, acesso, outro), um nível de urgência (baixa a crítica) e de 2 a 4 passos concretos de diagnóstico inicial — antes mesmo de um humano abrir o chamado. O agente sempre pode corrigir a leitura da IA; a IA ajuda na triagem, não substitui o julgamento.

### Funcionalidades
- Acesso por papel: **Requester** (abre e acompanha os próprios chamados) e **Agent** (trabalha a fila toda)
- Triagem assistida por IA no envio do chamado, via uma Supabase Edge Function que chama a API do Gemini — a chave de API nunca chega ao navegador
- Agentes podem reclassificar manualmente categoria/urgência e mudar o status do chamado
- Row Level Security garantindo que cada requester só vê os próprios chamados
- Degradação graciosa: se a chamada de IA falhar, o chamado é criado do mesmo jeito, marcado pra classificação manual

### Tecnologias utilizadas
- React + TypeScript, Vite
- Tailwind CSS + shadcn/ui
- Supabase (PostgreSQL, Auth, Row Level Security, Edge Functions)
- Google Gemini API pra classificação de chamados

### Como rodar localmente
```bash
git clone https://github.com/GabriellyFerreiraa/ticketsense.git
cd ticketsense
npm install
npm run dev
```
Esse projeto se conecta a um projeto real do Supabase e chama a API do Gemini através de uma Supabase Edge Function, então os dois precisam estar configurados (veja abaixo) pro funcionamento completo.

### Configurando do zero
1. Cria um projeto no Supabase e roda a migration de `supabase/migrations/` pelo SQL Editor
2. Copia sua Project URL e anon key em `src/integrations/supabase/client.ts`
3. Pega uma API key grátis no [Google AI Studio](https://aistudio.google.com/app/apikey), depois publica a Edge Function e configura o segredo:
   ```bash
   supabase functions deploy classify-ticket
   supabase secrets set GEMINI_API_KEY=sua_chave_aqui
   ```

---

## 👩‍💻 Author / Autora

**Gabrielly Ferreira**
📫 gabiferreira101@gmail.com
🔗 [LinkedIn](https://www.linkedin.com/in/gabrielly-ferreira-619609113/)
