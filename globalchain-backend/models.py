from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="Buyer")   # "Admin", "Buyer", "Supplier", "Tier2"
    tier = Column(Integer, default=0)        # 0=main/admin, 1=tier1, 2=tier2
    company = Column(String, default="")
    status = Column(String, default="Pending")  # "Pending", "Approved", "Suspended"
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    tier = Column(Integer, default=1)        # 0=main company, 1, 2, or 3
    lat = Column(Float)
    lng = Column(Float)
    region = Column(String, default="")
    product = Column(String, default="")

    # Operational attributes
    cost = Column(Float, default=1.0)             # normalized 0–1 (raw cost in $M)
    capacity = Column(Float, default=0.5)         # 0–1
    quality = Column(Float, default=0.8)          # 0–1
    has_backup = Column(Boolean, default=False)
    revenue_contribution = Column(Float, default=0.1)  # 0–1 fraction of total revenue

    # Computed scores (updated by engines)
    risk_score = Column(Float, default=0.1)
    dependency_score = Column(Float, default=0.0)
    supplier_score = Column(Float, default=0.5)

    # Approval workflow
    status = Column(String, default="approved")  # "pending", "approved", "rejected"

    # Backup supplier link
    backup_supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True)

    # Owner (which user registered this supplier)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    owner = relationship("User", foreign_keys=[owner_id])
    backup_supplier = relationship("Supplier", remote_side=[id], foreign_keys=[backup_supplier_id])
    outgoing_edges = relationship("SupplyEdge", foreign_keys="SupplyEdge.from_supplier_id", back_populates="from_node")
    incoming_edges = relationship("SupplyEdge", foreign_keys="SupplyEdge.to_supplier_id", back_populates="to_node")


class SupplyEdge(Base):
    """Directed edge: from_supplier_id → to_supplier_id (downstream to upstream)"""
    __tablename__ = "supply_edges"

    id = Column(Integer, primary_key=True, index=True)
    from_supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    to_supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    dependency_weight = Column(Float, default=0.8)  # 0–1, how critical this link is

    from_node = relationship("Supplier", foreign_keys=[from_supplier_id], back_populates="outgoing_edges")
    to_node = relationship("Supplier", foreign_keys=[to_supplier_id], back_populates="incoming_edges")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True)
    severity = Column(String, default="Low")   # "Critical", "Moderate", "Low"
    message = Column(Text)
    risk_value = Column(Float, default=0.0)
    acknowledged = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    supplier = relationship("Supplier")


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    alternative_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    cost_saving_pct = Column(Float, default=0.0)
    risk_reduction_pct = Column(Float, default=0.0)
    quality_improvement = Column(Float, default=0.0)
    profit_gain_pct = Column(Float, default=0.0)
    confidence = Column(Float, default=0.5)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    supplier = relationship("Supplier", foreign_keys=[supplier_id])
    alternative = relationship("Supplier", foreign_keys=[alternative_id])


class SimulationResult(Base):
    __tablename__ = "simulation_results"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String)
    event_location = Column(String)
    severity = Column(Float)
    impacted_count = Column(Integer, default=0)
    total_loss = Column(Float, default=0.0)
    result_json = Column(Text)   # full serialized result
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class RiskHistory(Base):
    __tablename__ = "risk_history"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    risk_score = Column(Float)
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())

    supplier = relationship("Supplier")
