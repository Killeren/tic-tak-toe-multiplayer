# Use official Nakama image
FROM heroiclabs/nakama:3.17.1

# Copy Railway production configuration as local.yml (Nakama's default)
COPY railway.yml /nakama/data/local.yml

# Copy game server logic
COPY build/ /nakama/data/modules/build/

# Expose ports
EXPOSE 7349 7350 7351

# Use shell form to allow environment variable expansion
# Railway will inject DATABASE_URL environment variable
CMD /nakama/nakama migrate up --database.address "${DATABASE_URL}" && \
    /nakama/nakama --config /nakama/data/local.yml --database.address "${DATABASE_URL}"
