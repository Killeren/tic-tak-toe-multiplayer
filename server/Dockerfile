# Use official Nakama image
FROM heroiclabs/nakama:3.17.1

# Copy Railway production configuration as local.yml (Nakama's default)
COPY railway.yml /nakama/data/local.yml

# Copy game server logic
COPY build/ /nakama/data/modules/build/

# Expose ports
EXPOSE 7349 7350 7351

# Let Nakama start normally - it will read DATABASE_URL from environment
# The Nakama base image already has the right ENTRYPOINT
