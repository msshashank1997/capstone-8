#!/bin/bash

# Finance Dashboard Docker Deployment Script

echo "🚀 Finance Dashboard - Docker Deployment"
echo "========================================"

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo "❌ Docker is not running. Please start Docker and try again."
        exit 1
    fi
    echo "✅ Docker is running"
}

# Function to check if Docker Compose is available
check_docker_compose() {
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        echo "❌ Docker Compose is not installed. Please install Docker Compose and try again."
        exit 1
    fi
    echo "✅ Docker Compose is available"
}

# Function to create .env file if it doesn't exist
setup_env() {
    if [ ! -f .env ]; then
        echo "📝 Creating .env file from template..."
        cp .env.example .env
        echo "⚠️  Please edit .env file with your actual configuration values"
        echo "   - Update JWT_SECRET with a secure random string"
        echo "   - Add your EXCHANGE_RATE_API_KEY"
        echo "   - Configure Azure OpenAI credentials if needed"
        echo ""
        read -p "Press Enter to continue after updating .env file..."
    else
        echo "✅ .env file exists"
    fi
}

# Function to deploy development environment
deploy_dev() {
    echo "🔧 Deploying Development Environment..."
    echo "======================================"
    
    echo "🏗️  Building and starting services..."
    docker-compose down --remove-orphans
    docker-compose up --build -d
    
    echo ""
    echo "🎉 Development deployment complete!"
    echo ""
    echo "🌐 Access your application:"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend API: http://localhost:3001"
    echo "   With Nginx: http://localhost"
    echo "   MongoDB: localhost:27017"
    echo ""
    echo "📊 Check logs with:"
    echo "   docker-compose logs -f [service-name]"
}

# Function to deploy production environment
deploy_prod() {
    echo "🏭 Deploying Production Environment..."
    echo "====================================="
    
    echo "🏗️  Building and starting production services..."
    docker-compose -f docker-compose.prod.yml down --remove-orphans
    docker-compose -f docker-compose.prod.yml up --build -d
    
    echo ""
    echo "🎉 Production deployment complete!"
    echo ""
    echo "🌐 Access your application:"
    echo "   Application: http://localhost"
    echo "   MongoDB: localhost:27017"
    echo ""
    echo "📊 Check logs with:"
    echo "   docker-compose -f docker-compose.prod.yml logs -f [service-name]"
}

# Function to deploy microservices
deploy_microservices() {
    echo "🏗️  Deploying Microservices Architecture..."
    echo "=========================================="
    
    cd microservices
    echo "🏗️  Building and starting microservices..."
    docker-compose down --remove-orphans
    docker-compose up --build -d
    
    echo ""
    echo "🎉 Microservices deployment complete!"
    echo ""
    echo "🌐 Access your application:"
    echo "   Frontend: http://localhost:3000"
    echo "   API Gateway: http://localhost:3001"
    echo "   With Nginx: http://localhost"
    echo "   Individual Services: http://localhost:3002-3008"
    echo ""
    echo "📊 Check logs with:"
    echo "   docker-compose logs -f [service-name]"
    
    cd ..
}

# Function to show service status
show_status() {
    echo "📊 Service Status:"
    echo "=================="
    docker-compose ps
    echo ""
    echo "💾 Volume Usage:"
    echo "==============="
    docker volume ls | grep capstone
    echo ""
    echo "🌐 Network Info:"
    echo "==============="
    docker network ls | grep capstone
}

# Function to cleanup
cleanup() {
    echo "🧹 Cleaning up Docker resources..."
    echo "================================="
    
    read -p "This will stop and remove all containers, volumes, and networks. Continue? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker-compose down --remove-orphans --volumes
        docker-compose -f docker-compose.prod.yml down --remove-orphans --volumes 2>/dev/null || true
        cd microservices && docker-compose down --remove-orphans --volumes 2>/dev/null || true && cd ..
        
        echo "🗑️  Removing unused Docker resources..."
        docker system prune -f
        
        echo "✅ Cleanup complete!"
    else
        echo "❌ Cleanup cancelled"
    fi
}

# Main menu
show_menu() {
    echo ""
    echo "Please select deployment option:"
    echo "1) Development Environment (Hot reload, debug mode)"
    echo "2) Production Environment (Optimized builds)"
    echo "3) Microservices Architecture (7 separate services)"
    echo "4) Show Service Status"
    echo "5) Cleanup All Resources"
    echo "6) Exit"
    echo ""
}

# Pre-deployment checks
check_docker
check_docker_compose
setup_env

# Main deployment loop
while true; do
    show_menu
    read -p "Enter your choice (1-6): " choice
    
    case $choice in
        1)
            deploy_dev
            ;;
        2)
            deploy_prod
            ;;
        3)
            deploy_microservices
            ;;
        4)
            show_status
            ;;
        5)
            cleanup
            ;;
        6)
            echo "👋 Goodbye!"
            exit 0
            ;;
        *)
            echo "❌ Invalid option. Please try again."
            ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..."
done
