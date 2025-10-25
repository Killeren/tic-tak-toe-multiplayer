# Use official Nakama image
FROM heroiclabs/nakama:3.17.1

# Copy Railway production configuration as local.yml (Nakama's default)
COPY railway.yml /nakama/data/local.yml

# Copy game server logic
COPY build/ /nakama/data/modules/build/

# Copy and set up entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Expose ports
EXPOSE 7349 7350 7351

# Use our entrypoint script that will handle DATABASE_URL
ENTRYPOINT ["/entrypoint.sh"]
