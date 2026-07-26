# Univerzalni deploy (Railway, Fly.io, Render, bilo koji Docker host)
FROM node:20-alpine
WORKDIR /app
COPY . .
# Nema npm zavisnosti — ništa se ne instalira.
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
