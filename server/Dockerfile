# Use official Nakama image
FROM heroiclabs/nakama:3.17.1

# Copy Railway production configuration
COPY railway.yml /nakama/data/railway.yml

# Also copy as local.yml to satisfy Nakama's default config search
COPY railway.yml /nakama/data/local.yml

# Copy game server logic
COPY build/ /nakama/data/modules/build/

# Copy startup script
COPY start-railway.sh /start-railway.sh
RUN chmod +x /start-railway.sh

# Expose ports
EXPOSE 7349 7350 7351

# Completely override both ENTRYPOINT and CMD
# Use shell form to ensure our script runs
ENTRYPOINT ["/bin/bash"]
CMD ["/start-railway.sh"]
